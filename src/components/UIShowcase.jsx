// src/components/UIShowcase.jsx
// ⚠️ FICHIER DE TEST — À SUPPRIMER après validation du design system
import { useState } from "react";
import {
  Plus, Check, Trash2, Edit2, Save, X, Search, Download,
  AlertCircle, Info, Bell, Settings,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useTokens } from "@/theme/tokens";
import {
  Button, IconButton,
  Badge, RoleBadge, StatusDot,
  Modal,
} from "@/components/ui";

export function UIShowcase() {
  const { dark, toggle } = useStyles();
  const t = useTokens();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.surface.page,
        color: t.text.primary,
        padding: 24,
        fontFamily: t.font.family,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ═══════════ HEADER ═══════════ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 700,
                color: t.text.primary,
              }}
            >
              Design System — Showcase
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 14,
                color: t.text.muted,
              }}
            >
              Test visuel de tous les composants UI
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={toggle}
            icon={dark ? <Bell size={16} /> : <Bell size={16} />}
          >
            {dark ? "Mode clair" : "Mode sombre"}
          </Button>
        </div>

        {/* ═══════════ SECTION 1 — BUTTONS ═══════════ */}
        <Section title="Buttons" t={t}>
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
          </Row>
          <Row>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </Row>
          <Row>
            <Button variant="primary" icon={<Plus size={16} />}>
              Avec icône gauche
            </Button>
            <Button variant="success" iconRight={<Check size={16} />}>
              Avec icône droite
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading>
              Loading…
            </Button>
          </Row>
          <Row>
            <Button variant="primary" disabled>
              Désactivé
            </Button>
            <Button variant="secondary" disabled>
              Désactivé
            </Button>
          </Row>
          <Row>
            <Button
              variant="primary"
              fullWidth
              icon={<Save size={16} />}
            >
              Full width
            </Button>
          </Row>
        </Section>

        {/* ═══════════ SECTION 2 — ICON BUTTONS ═══════════ */}
        <Section title="Icon Buttons" t={t}>
          <Row>
            <IconButton
              icon={<Plus size={18} />}
              label="Ajouter"
              variant="primary"
            />
            <IconButton
              icon={<Edit2 size={18} />}
              label="Modifier"
              variant="ghost"
            />
            <IconButton
              icon={<Trash2 size={18} />}
              label="Supprimer"
              variant="ghost"
            />
            <IconButton
              icon={<Check size={18} />}
              label="Valider"
              variant="outline"
            />
            <IconButton
              icon={<X size={18} />}
              label="Fermer"
              variant="ghost"
              size="sm"
            />
            <IconButton
              icon={<Search size={22} />}
              label="Rechercher"
              variant="outline"
              size="lg"
            />
          </Row>
          <Row>
            <span style={{ fontSize: 13, color: t.text.muted }}>
              État actif :
            </span>
            <IconButton
              icon={<Bell size={18} />}
              label="Actif"
              variant="outline"
              active
            />
            <IconButton
              icon={<Trash2 size={18} />}
              label="Désactivé"
              variant="ghost"
              disabled
            />
          </Row>
        </Section>

        {/* ═══════════ SECTION 3 — BADGES ═══════════ */}
        <Section title="Badges (statuts)" t={t}>
          <Row>
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="danger">Suspendue</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="neutral">Neutre</Badge>
          </Row>
          <Row>
            <Badge variant="success" size="sm">Petit</Badge>
            <Badge variant="warning" size="md">Moyen</Badge>
            <Badge variant="danger" dot>Suspendue</Badge>
            <Badge variant="success" dot>Active</Badge>
          </Row>
          <Row>
            <Badge variant="info" outline>Info outline</Badge>
            <Badge variant="success" outline>Success outline</Badge>
            <Badge variant="danger" outline>Danger outline</Badge>
          </Row>
          <Row>
            <Badge variant="success" icon={<Check size={12} />}>
              Vérifié
            </Badge>
            <Badge variant="danger" icon={<AlertCircle size={12} />}>
              Erreur
            </Badge>
            <Badge variant="info" icon={<Info size={12} />}>
              Information
            </Badge>
          </Row>
        </Section>

        {/* ═══════════ SECTION 4 — ROLE BADGES ═══════════ */}
        <Section title="Role Badges" t={t}>
          <Row>
            <RoleBadge role="admin" />
            <RoleBadge role="superAdmin" />
            <RoleBadge role="directeur" />
            <RoleBadge role="enseignant" />
            <RoleBadge role="parent" />
            <RoleBadge role="eleve" />
            <RoleBadge role="disciplinaire" />
            <RoleBadge role="comptable" />
          </Row>
          <Row>
            <RoleBadge role="enseignant" size="sm" />
            <RoleBadge role="parent" size="md" />
          </Row>
        </Section>

        {/* ═══════════ SECTION 5 — STATUS DOTS ═══════════ */}
        <Section title="Status Dots" t={t}>
          <Row>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: t.text.primary,
              }}
            >
              <StatusDot variant="success" /> Actif
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: t.text.primary,
              }}
            >
              <StatusDot variant="warning" pulse /> En attente
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: t.text.primary,
              }}
            >
              <StatusDot variant="danger" /> Suspendu
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: t.text.primary,
              }}
            >
              <StatusDot variant="info" /> Info
            </span>
          </Row>
        </Section>

        {/* ═══════════ SECTION 6 — MODAL ═══════════ */}
        <Section title="Modal" t={t}>
          <Row>
            <Button
              variant="primary"
              onClick={() => setModalOpen(true)}
              icon={<Plus size={16} />}
            >
              Ouvrir la modal
            </Button>
          </Row>
          <p
            style={{
              fontSize: 13,
              color: t.text.muted,
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            Tests : clic overlay → ferme · Échap → ferme · Scroll body bloqué ·
            Focus restauré
          </p>
        </Section>

        {/* ═══════════ SECTION 7 — CARTE EXEMPLE ═══════════ */}
        <Section title="Carte exemple (avec tokens)" t={t}>
          <div
            style={{
              background: t.surface.default,
              borderRadius: t.radius.lg,
              padding: 20,
              border: `1px solid ${t.border.default}`,
              boxShadow: t.shadow.sm,
              maxWidth: 400,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{ fontWeight: 700, fontSize: 16, color: t.text.primary }}
              >
                Complexe Scolaire La Grâce
              </span>
              <Badge variant="success" size="sm">
                Active
              </Badge>
            </div>
            <p
              style={{
                fontSize: 13,
                color: t.text.muted,
                margin: "0 0 12px",
              }}
            >
              Code :{" "}
              <span style={{ fontFamily: t.font.mono }}>ABC123</span>
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <RoleBadge role="directeur" />
              <Badge variant="info" size="sm">73 users</Badge>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" size="sm" icon={<Edit2 size={14} />}>
                Modifier
              </Button>
              <Button variant="secondary" size="sm">
                Voir plus
              </Button>
            </div>
          </div>
        </Section>

        {/* ═══════════ MODAL ═══════════ */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirmer l'action"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => setModalOpen(false)}
                icon={<Trash2 size={14} />}
              >
                Supprimer
              </Button>
            </>
          }
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: t.status.danger.bg,
                color: t.status.danger.fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertCircle size={20} />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.text.primary,
                }}
              >
                Êtes-vous sûr ?
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13.5,
                  color: t.text.muted,
                  lineHeight: 1.5,
                }}
              >
                Cette action est irréversible. L'école et toutes ses données
                seront supprimées définitivement.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS INTERNES
// ════════════════════════════════════════════════════════════════════

function Section({ title, children, t }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: t.text.muted,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${t.border.default}`,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </section>
  );
}

function Row({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

export default UIShowcase;