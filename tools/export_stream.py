"""Incremental access to the compressed JSON inside native CLIO HTML archives."""

from __future__ import annotations

import base64
import binascii
import zlib
from collections.abc import Generator
from pathlib import Path

MARKER = b'window.CLIO_EXPORT_DATA="'


def payload_chunks(source: Path, chunk_size: int = 65536) -> Generator[bytes, None, None]:
    """Yield decompressed payload chunks, retaining neither the HTML nor binary assets."""
    if chunk_size < 1:
        raise ValueError("chunk_size must be positive")
    decoder = zlib.decompressobj(16 + zlib.MAX_WBITS)
    found = False
    pending = b""
    with source.open("rb") as stream:
        while chunk := stream.read(chunk_size):
            pending += chunk
            if not found:
                position = pending.find(MARKER)
                if position < 0:
                    pending = pending[-(len(MARKER) - 1) :]
                    continue
                pending = pending[position + len(MARKER) :]
                found = True
            quote = pending.find(b'"')
            ended = quote >= 0
            if ended:
                pending = pending[:quote]
            length = len(pending) if ended else (len(pending) // 4) * 4
            if length:
                try:
                    compressed = base64.b64decode(pending[:length], validate=True)
                except binascii.Error as error:
                    raise ValueError(f"Invalid export base64: {source}") from error
                pending = pending[length:]
                while compressed:
                    try:
                        block = decoder.decompress(compressed, 262144)
                    except zlib.error as error:
                        raise ValueError(f"Invalid export gzip: {source}") from error
                    compressed = decoder.unconsumed_tail
                    if block:
                        yield block
            if ended:
                tail = decoder.flush()
                if tail:
                    yield tail
                if not decoder.eof:
                    raise ValueError(f"Truncated export gzip: {source}")
                return
    raise ValueError(f"Missing or incomplete CLIO export payload: {source}")


class ExportStream:
    """A bounded-read file interface for ijson, closable before embedded assets are reached."""

    def __init__(self, source: Path, chunk_size: int = 65536) -> None:
        self._chunks = payload_chunks(source, chunk_size)
        self._buffer = bytearray()
        self._ended = False

    def read(self, size: int = 65536) -> bytes:
        """Read at most the requested bytes; unbounded reads are deliberately rejected."""
        if size < 0:
            raise ValueError("ExportStream requires a bounded read size")
        while len(self._buffer) < size and not self._ended:
            block = next(self._chunks, None)
            if block is None:
                self._ended = True
            else:
                self._buffer.extend(block)
        result = bytes(self._buffer[:size])
        del self._buffer[:size]
        return result

    def close(self) -> None:
        """Release the original archive handle after selection, completion or failure."""
        self._chunks.close()
        self._buffer.clear()
