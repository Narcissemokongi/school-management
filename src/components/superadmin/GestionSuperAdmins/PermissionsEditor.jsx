// src/components/SuperAdmin/GestionSuperAdmins/PermissionsEditor.jsx
import { useState, useMemo } from "react";
import { useTokens } from "@/theme/tokens";
import { Button } from "@/components/ui";
import {
  School, Users, Megaphone, CreditCard, DollarSign, AlertTriangle,
  Clock, Activity, BarChart3, Settings, Check, Sparkles, X,
} from "lucide-react";

const ICONS = {
  School, Users, Megaphone, CreditCard, DollarSign, AlertTriangle,
  Clock, Activity, BarChart3, Settings,
};

const ACTION_LABELS = {
  read: "Lire",
  write: "Modifier",
  delete: "Supprimer",
};

const ACTION_COLORS = {
  read: "#3B82F6",
  write: "#F59E0B",
  delete: "#EF4444",
};

export function PermissionsEditor({
  catalog,
  permissions,
  onChange,
}) {
  const t = useTokens();
  const [showPresets, setShowPresets] = useState(false);

  const permSet = useMemo(() => new Set(permissions), [permissions]);

  const togglePermission = (perm) => {
    const next = new Set(permSet);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    onChange(Array.from(next));
  };

  const toggleModuleAll = (moduleName, actions, checked) => {
    const next = new Set(permSet);
    for (const action of actions) {
      const p = `${moduleName}.${action}`;
      if (checked) next.add(p);
      else next.delete(p);
    }
    onChange(Array.from(next));
  };

  const applyPreset = (presetKey) => {
    const preset = catalog.presets[presetKey];
    if (!preset) return;
    onChange([...preset.permissions]);
    setShowPresets(false);
  };

  const countByModule = useMemo(() => {
    const result = {};
    for (const [mod, conf] of Object.entries(catalog.modules)) {
      const total = conf.actions.length;
      const active = conf.actions.filter((a) =>
        permSet.has(`${mod}.${a}`)
      ).length;
      result[mod] = { total, active };
    }
    return result;
  }, [catalog, permSet]);

  const totalActive = permissions.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
      {/* Header : total + presets */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: t.space.sm,
          background: `${t.accent.primary}08`,
          border: `1px solid ${t.accent.primary}20`,
          borderRadius: t.radius.sm,
        }}
      >
        <div>
          <div
            style={{
              fontSize: t.font.size.sm,
              fontWeight: 700,
              color: t.text.primary,
            }}
          >
            {totalActive} permission{totalActive > 1 ? "s" : ""} active
            {totalActive > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
            {totalActive === 0 && "Aucune permission → compte inactif"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: t.accent.primary,
            color: "#FFFFFF",
            border: "none",
            borderRadius: t.radius.sm,
            cursor: "pointer",
            fontSize: t.font.size.xs,
            fontWeight: 600,
            fontFamily: t.font.family,
          }}
        >
          <Sparkles size={12} />
          Presets
        </button>
      </div>

      {/* Presets */}
      {showPresets && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            padding: t.space.sm,
            background: t.surface.hover ?? "#FAFAFA",
            borderRadius: t.radius.sm,
            border: `1px solid ${t.border.subtle}`,
          }}
        >
          {Object.entries(catalog.presets).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              style={{
                padding: 8,
                background: t.surface.elevated,
                border: `1px solid ${t.border.default}`,
                borderRadius: t.radius.sm,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: t.font.family,
              }}
            >
              <div
                style={{
                  fontSize: t.font.size.xs,
                  fontWeight: 700,
                  color: t.text.primary,
                }}
              >
                {preset.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: t.text.secondary,
                  marginTop: 2,
                }}
              >
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Module tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Object.entries(catalog.modules).map(([mod, conf]) => {
          const Icon = ICONS[conf.icon] ?? School;
          const counts = countByModule[mod];
          const allChecked = counts.active === counts.total;
          const someChecked = counts.active > 0 && !allChecked;

          return (
            <div
              key={mod}
              style={{
                border: `1px solid ${t.border.subtle}`,
                borderRadius: t.radius.sm,
                overflow: "hidden",
              }}
            >
              {/* Header module */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.space.sm,
                  padding: t.space.sm,
                  background: someChecked
                    ? `${t.accent.primary}08`
                    : t.surface.elevated,
                }}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={(e) => toggleModuleAll(mod, conf.actions, e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: t.radius.sm,
                    background: `${t.accent.primary}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} color={t.accent.primary} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: t.font.size.sm,
                      fontWeight: 600,
                      color: t.text.primary,
                    }}
                  >
                    {conf.label}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: t.text.muted,
                    }}
                  >
                    {conf.description}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: counts.active > 0 ? t.accent.primary : t.text.muted,
                    background:
                      counts.active > 0
                        ? `${t.accent.primary}15`
                        : t.surface.hover,
                    padding: "2px 6px",
                    borderRadius: t.radius.full,
                  }}
                >
                  {counts.active}/{counts.total}
                </span>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: `0 ${t.space.sm} ${t.space.sm}`,
                  flexWrap: "wrap",
                }}
              >
                {conf.actions.map((action) => {
                  const perm = `${mod}.${action}`;
                  const active = permSet.has(perm);
                  const color = ACTION_COLORS[action] ?? t.accent.primary;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => togglePermission(perm)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: active ? `${color}15` : "transparent",
                        border: `1px solid ${active ? color : t.border.default}`,
                        color: active ? color : t.text.secondary,
                        borderRadius: t.radius.sm,
                        cursor: "pointer",
                        fontSize: t.font.size.xs,
                        fontWeight: 600,
                        fontFamily: t.font.family,
                      }}
                    >
                      {active && <Check size={10} />}
                      {ACTION_LABELS[action] ?? action}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PermissionsEditor;