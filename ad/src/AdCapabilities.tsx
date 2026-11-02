import React from "react";
import {
  Box,
  ChevronRight,
  Check,
  Database,
  Plus,
  Sparkles,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  adAddition,
  adModuleRows,
  adPromptBounds,
  adPluginControl,
  adTreePoses,
  copy,
  tree,
  type AdModule,
} from "./composable-ad-plan";
import { phase } from "./prompt-morph";

/** A recognizable plugin row owns the branches below it; there are no summary counts. */
export function PluginNode({
  module,
  frame,
  open = 0,
  rowOpacity = [],
  morph = 1,
  control,
  selected = false,
  style = {},
}: {
  module: AdModule;
  frame: number;
  open?: number;
  rowOpacity?: number[];
  morph?: number;
  control?: ReturnType<typeof adPluginControl>;
  selected?: boolean;
  style?: React.CSSProperties;
}) {
  const rows = adModuleRows(module),
    height = tree.header + (22 + rows.length * tree.rowHeight) * open;
  return (
    <div
      className="ad-plugin-frame"
      data-ad-plugin={module.id}
      data-ad-selection-frame={selected ? frame : undefined}
      data-ad-add-frame={control?.adding ? frame : undefined}
      style={{ ...style, height }}
    >
      <div className="ad-plugin">
        <div
          className="ad-plugin-title"
          style={{
            background: module.color,
            borderRadius: 8 + 7 * morph,
            paddingLeft: 17 + 3 * morph,
            gap: 14 - 2 * morph,
          }}
        >
          <Box size={23 + 2 * morph} />
          <strong
            data-ad-plugin-name
            style={{
              fontSize: 25 + morph,
              fontWeight: 500 + 50 * morph,
              letterSpacing: -0.7 * morph,
            }}
          >
            {module.name}
          </strong>
          <span
            className="ad-plugin-control"
            data-ad-control
            data-ad-control-action={
              control?.kind ?? (morph < 0.5 ? "choose" : "remove")
            }
            style={{
              right: 17 + 3 * morph,
              background: `rgba(255,255,255,${0.75 * (control?.hover ?? 0)})`,
              boxShadow: `0 0 0 6px rgba(255,255,255,${0.75 * (control?.hover ?? 0)})`,
            }}
          >
            {control ? (
              control.kind === "add" ? (
                <Plus size={19} style={{ opacity: control.opacity }} />
              ) : control.kind === "added" ? (
                <Check size={19} style={{ opacity: control.opacity }} />
              ) : (
                <X
                  size={17}
                  style={{ left: 1, top: 1, opacity: control.opacity }}
                />
              )
            ) : (
              <>
                <ChevronRight
                  size={19}
                  style={{ opacity: 1 - phase(morph, 0, 0.4) }}
                />
                <X
                  data-ad-plugin-remove
                  size={17}
                  style={{ left: 1, top: 1, opacity: phase(morph, 0.6, 0.4) }}
                />
              </>
            )}
          </span>
        </div>
        {open > 0.001 ? (
          <div className="ad-capabilities">
            {rows.map((row, index) => {
              const reveal = rowOpacity[index] ?? 0;
              if (reveal <= 0.001) return null;
              const Icon =
                row.family === "skills"
                  ? Sparkles
                  : row.family === "mcpServers"
                    ? Database
                    : row.family === "tools"
                      ? Wrench
                      : Zap;
              return (
                <React.Fragment key={row.id}>
                  <svg
                    className="ad-leaf-edge"
                    width={48}
                    height={tree.rowTop + index * tree.rowHeight + 20}
                  >
                    <path
                      d={`M20 48 V${tree.rowTop + index * tree.rowHeight + 19} H43`}
                      fill="none"
                      stroke="#86aabb"
                      strokeWidth={1.5}
                      pathLength={1}
                      strokeDasharray="1 1"
                      strokeDashoffset={1 - reveal}
                      opacity={reveal}
                    />
                  </svg>
                  <div
                    className="ad-capability-row"
                    data-ad-capability={row.id}
                    data-ad-owner={row.owner}
                    style={{
                      top: tree.rowTop + index * tree.rowHeight,
                      opacity: reveal,
                      transform: `translateX(${10 * (1 - reveal)}px)`,
                    }}
                  >
                    <span
                      className="ad-capability-icon"
                      style={{ background: module.color }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="ad-capability-label">{row.label}</span>
                    <strong data-ad-capability-name>{row.name}</strong>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The connected tree persists while branches are added, removed and reused. */
export function AdCapabilities({ frame }: { frame: number }) {
  const poses = adTreePoses(frame),
    offer = adAddition(frame),
    pending = offer && frame < offer.change.at ? offer : null,
    visible = poses.filter((pose) => pose.opacity > 0.001),
    anchors = [
      ...visible.map((pose) => ({ ...pose })),
      ...(pending ? [{ ...pending, edge: pending.opacity }] : []),
    ],
    fade = 1 - phase(frame, copy.closing.at, 32),
    paper = adPromptBounds();
  const ys = anchors
    .filter((pose) => pose.edge > 0.001)
    .map((pose) => pose.y + tree.header / 2);
  return (
    <>
      {ys.length ? (
        <svg
          className="ad-tree-edges"
          width={1920}
          height={1080}
          style={{ opacity: fade }}
        >
          <path
            d={`M${paper.x + paper.width} 420 H1208 M1208 ${Math.min(420, ...anchors.map((pose) => 420 + (pose.y + tree.header / 2 - 420) * pose.edge))} V${Math.max(420, ...anchors.map((pose) => 420 + (pose.y + tree.header / 2 - 420) * pose.edge))}`}
            stroke="#86aabb"
            strokeWidth={1.5}
            fill="none"
          />
          {anchors.map((pose) => (
            <path
              key={pose.module.id}
              d={`M1208 ${pose.y + tree.header / 2} H${pose.x}`}
              stroke="#86aabb"
              strokeWidth={1.5}
              fill="none"
              opacity={pose.edge}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - pose.edge}
            />
          ))}
        </svg>
      ) : null}
      {pending ? (
        <PluginNode
          module={pending.module}
          frame={frame}
          control={adPluginControl(frame, pending.module.id)}
          style={{
            position: "absolute",
            left: pending.x,
            top: pending.y,
            width: pending.width,
            opacity: pending.opacity * fade,
            zIndex: 5,
          }}
        />
      ) : null}
      {poses.map((pose) => (
        <PluginNode
          key={pose.module.id}
          module={pose.module}
          frame={frame}
          open={pose.open}
          rowOpacity={pose.rows.map((row) => row.opacity)}
          control={adPluginControl(frame, pose.module.id)}
          style={{
            position: "absolute",
            left: pose.x,
            top: pose.y,
            width: pose.width,
            opacity: pose.opacity * fade,
            zIndex: 5,
          }}
        />
      ))}
    </>
  );
}
