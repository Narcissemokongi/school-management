// src/components/messagerie/ChatInput.jsx
import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Paperclip, Send, X, Loader } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const ChatInputKeyframes = (
  <style>{`
    @keyframes ci-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes ci-fade-in {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    .ci-spin { animation: ci-spin 0.8s linear infinite; }
    .ci-fade-in { animation: ci-fade-in 0.15s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .ci-spin, .ci-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS — même système que le reste de la messagerie
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    surface: dark ? "#1E293B" : "#FFFFFF",
    surfaceHover: dark ? "#26334D" : "#F8FAFC",
    inputBg: dark ? "#0F172A" : "#F1F5F9",
    inputBorder: dark ? "#334155" : "#E2E8F0",
    inputText: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    primarySoftText: dark ? "#C7D2FE" : "#4F46E5",
    ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    disabledBg: dark ? "#334155" : "#E2E8F0",
    disabledText: dark ? "#64748B" : "#94A3B8",
    danger: dark ? "#F87171" : "#EF4444",
    dangerSoft: dark ? "#7F1D1D" : "#FEE2E2",
    border: dark ? "#334155" : "#E2E8F0",
  };
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

/** Bouton icône rond avec hover + focus + taille tactile */
function CircleIconButton({
  icon,
  label,
  onClick,
  tokens,
  disabled = false,
  variant = "ghost",
  size = 44,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const bg = disabled
    ? "transparent"
    : variant === "primary"
    ? hovered
      ? `linear-gradient(135deg, ${tokens.primaryHover}, ${tokens.primary})`
      : `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`
    : hovered
    ? tokens.ghostHover
    : "transparent";

  const color = disabled
    ? tokens.disabledText
    : variant === "primary"
    ? "#FFFFFF"
    : tokens.textMuted;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: bg,
        border: "none",
        borderRadius: "50%",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        color,
        flexShrink: 0,
        transition: "background 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease",
        boxShadow:
          variant === "primary" && !disabled && !hovered
            ? "0 4px 12px rgba(79,70,229,0.25)"
            : "none",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        opacity: disabled ? 0.6 : 1,
        padding: 0,
      }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

/** Chip d'une pièce jointe en attente d'envoi */
function AttachmentChip({ attachment, onRemove, tokens, isMobile }) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="ci-fade-in"
      style={{
        background: tokens.primarySoft,
        color: tokens.primarySoftText,
        padding: isMobile ? "5px 10px" : "4px 10px",
        borderRadius: 10,
        fontSize: 11.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <Paperclip size={12} style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
          maxWidth: 140,
        }}
        title={attachment.nom}
      >
        {attachment.nom}
      </span>
      <button
        type="button"
        onClick={onRemove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "rgba(0,0,0,0.08)" : "transparent",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          color: "inherit",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: -4,
          transition: "background 0.15s ease",
          flexShrink: 0,
        }}
        aria-label={`Retirer ${attachment.nom}`}
        title={`Retirer ${attachment.nom}`}
      >
        <X size={12} />
      </button>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function ChatInput({
  message,
  setMessage,
  onSend,
  fileInputRef,
  piecesJointes,
  setPiecesJointes,
  handleFileChange,
  placeholder = "Écrivez un message...",
  isUploading = false,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const textareaRef = useRef(null);
  const [textareaFocused, setTextareaFocused] = useState(false);

  const hasAttachments = piecesJointes?.length > 0;
  const hasText = Boolean(message?.trim());
  const disabled = !hasText && !hasAttachments;

  // ✅ Tailles tactiles : 44×44 sur mobile
  const buttonSize = isMobile ? 44 : 40;
  const inputFontSize = isMobile ? 16 : 14; // 16px évite le zoom iOS

  // ════════════════════════════════════════════════════════════════════
  // AUTO-RESIZE du textarea (max ~5 lignes)
  // ════════════════════════════════════════════════════════════════════
  // ✅ Scroll le textarea dans la vue au focus (utile sur mobile)
  useEffect(() => {
    if (!textareaFocused) return;
    const el = textareaRef.current;
    if (!el) return;
    // Petit délai pour laisser le clavier mobile s'ouvrir
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 150);
    return () => clearTimeout(t);
  }, [textareaFocused]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleKeyDown = useCallback(
    (e) => {
      // Enter (sans Shift) → envoyer
      if (e.key === "Enter" && !e.shiftKey && !isMobile) {
        e.preventDefault();
        if (!disabled) onSend();
      }
      // Escape → vider le brouillon (avec confirmation si texte)
      if (e.key === "Escape" && message?.trim()) {
        // On ne vide pas brutalement — on retire juste le focus
        textareaRef.current?.blur();
      }
    },
    [disabled, onSend, isMobile, message]
  );

  const handleRemoveAttachment = useCallback(
    (idx) => {
      setPiecesJointes((prev) => prev.filter((_, i) => i !== idx));
    },
    [setPiecesJointes]
  );

  const handleSendClick = useCallback(() => {
    if (disabled) return;
    onSend();
    // Refocus après envoi (sauf mobile où le clavier se ferme)
    if (!isMobile) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [disabled, onSend, isMobile]);

  const handleAttachClick = useCallback(() => {
    if (isUploading) return;
    fileInputRef?.current?.click();
  }, [isUploading, fileInputRef]);

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {ChatInputKeyframes}
      <div
        style={{
          padding: isMobile ? "8px 12px" : "10px 16px",
          paddingBottom: isMobile
            ? "calc(8px + env(safe-area-inset-bottom, 0px))"
            : 10,
          borderTop: `1px solid ${tokens.border}`,
          background: tokens.surface,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {/* ═══ Bouton pièce jointe ═══ */}
        {fileInputRef && (
          <>
            <CircleIconButton
              icon={
                isUploading ? (
                  <Loader size={18} className="ci-spin" />
                ) : (
                  <Paperclip size={isMobile ? 20 : 19} />
                )
              }
              label={isUploading ? "Upload en cours…" : "Joindre un fichier"}
              onClick={handleAttachClick}
              tokens={tokens}
              disabled={isUploading}
              size={buttonSize}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </>
        )}

        {/* ═══ Conteneur input ═══ */}
        <div
          style={{
            flex: 1,
            background: tokens.inputBg,
            border: `1.5px solid ${
              textareaFocused ? tokens.primary : tokens.inputBorder
            }`,
            borderRadius: 22,
            padding: isMobile ? "8px 14px" : "8px 16px",
            minWidth: 0,
            transition: "border-color 0.15s ease",
          }}
        >
          {/* Pièces jointes en attente */}
          {hasAttachments && (
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              {piecesJointes.map((pj, idx) => (
                <AttachmentChip
                  key={`${pj.url || pj.nom}-${idx}`}
                  attachment={pj}
                  onRemove={() => handleRemoveAttachment(idx)}
                  tokens={tokens}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}

          {/* Textarea auto-resize */}
          <textarea
            ref={textareaRef}
            rows={1}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: inputFontSize,
              width: "100%",
              color: tokens.inputText,
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.4,
              maxHeight: 120,
              boxSizing: "border-box",
              padding: 0,
              minHeight: 22,
            }}
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
            aria-label={placeholder}
          />
        </div>

        {/* ═══ Bouton envoyer ═══ */}
        <CircleIconButton
          icon={
            isUploading ? (
              <Loader size={isMobile ? 18 : 17} className="ci-spin" />
            ) : (
              <Send size={isMobile ? 19 : 18} />
            )
          }
          label="Envoyer le message"
          onClick={handleSendClick}
          tokens={tokens}
          disabled={disabled || isUploading}
          variant="primary"
          size={buttonSize}
        />
      </div>
    </>
  );
}