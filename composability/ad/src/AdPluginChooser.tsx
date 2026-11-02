import { Box, Check, Plus, Search } from "lucide-react";
import { adChooser, chooser, copy } from "./composable-ad-plan";
import { phase } from "./prompt-morph";

/** A persistent global add control opens a chooser before any new plugin arrives. */
export function AdPluginChooser({
  frame,
  includeBase = false,
}: {
  frame: number;
  includeBase?: boolean;
}) {
  const choice = adChooser(frame, includeBase),
    visibility = includeBase ? 1 : phase(frame, copy.staging.dockAt + 20, 12),
    fade = visibility * (1 - phase(frame, copy.closing.at, 32));
  return (
    <div data-ad-global-frame={frame} style={{ opacity: fade }}>
      <div
        style={{
          position: "absolute",
          left: chooser.x,
          top: chooser.y,
          width: chooser.width,
          height: chooser.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 21,
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 550 }}>Plugins</span>
        <div
          data-ad-global-plus
          style={{
            width: 50,
            height: 48,
            border: "1px solid #b5cbd5",
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background:
              choice && frame >= choice.openAt - 8 && frame < choice.selectAt
                ? "#e7f1f6"
                : "#fff",
          }}
        >
          <Plus size={26} />
        </div>
      </div>
      {choice && choice.opacity > 0 ? (
        <div
          data-ad-global-menu
          style={{
            position: "absolute",
            left: chooser.x,
            top: chooser.menuY,
            width: chooser.width,
            height: chooser.menuHeight,
            border: "1px solid #bfd2db",
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 12px 32px #163b501a",
            opacity: choice.opacity,
            zIndex: 22,
          }}
        >
          <div
            style={{
              height: chooser.rowTop,
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 22,
              color: "#547384",
            }}
          >
            <Search size={21} /> Add plugin
          </div>
          {choice.choices.map(({ module, installed }, index) => (
            <div
              key={module.id}
              data-ad-global-choice={module.id}
              data-ad-choice-disabled={installed}
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                top: chooser.rowTop + index * chooser.rowHeight,
                height: chooser.rowHeight,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 16px",
                fontSize: 25,
                borderRadius: 10,
                background:
                  module.id === choice.target.module.id && choice.hover > 0
                    ? module.color
                    : "transparent",
                opacity: installed ? 0.45 : 1,
              }}
            >
              <Box size={23} />
              <span>{module.name}</span>
              {installed ? (
                <Check size={20} style={{ marginLeft: "auto" }} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
