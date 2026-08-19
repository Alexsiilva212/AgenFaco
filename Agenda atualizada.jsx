import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UserCheck,
  Activity,
  Lock,
  ArrowLeft,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Eye,
  Loader2,
  ChevronRight,
  RotateCcw,
  ClipboardList,
  Pencil,
  FileDown,
  KeyRound,
  Save,
} from "lucide-react";

const BARRA_MAX_CARACTERES = 24;
function barraTexto(n, max) {
  if (max <= 0) return "";
  const cheios = Math.round((n / max) * BARRA_MAX_CARACTERES);
  return "█".repeat(cheios) + "░".repeat(BARRA_MAX_CARACTERES - cheios);
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SENHAS_PADRAO = { recepcao: "2026", centro: "2026", admin: "2026" };
const BASE_KEY = "agenda-faco:base";
const SENHAS_KEY = "agenda-faco:senhas";

const STATUS = {
  AGENDADO: "Agendado",
  PRESENCA: "Presença confirmada",
  FALTA: "Falta sem justificativa",
  ATENDIDO: "Atendido",
  INTERROMPIDO: "Atendimento interrompido",
};

// Cabeçalhos (barra do topo e faixa do menu) em azul + branco.
// Todo o resto (status, botões, gráficos, destaques por setor) mantém as cores originais.
const HEADER_BG = "#123E6B";

const STATUS_STYLE = {
  [STATUS.AGENDADO]: { bg: "#EEF2F1", fg: "#4B5F5C", dot: "#9FB3AF" },
  [STATUS.PRESENCA]: { bg: "#E7F0FB", fg: "#1D5A96", dot: "#2E7FC7" },
  [STATUS.FALTA]: { bg: "#FBEAE7", fg: "#A63F2B", dot: "#D9633F" },
  [STATUS.ATENDIDO]: { bg: "#E7F5EE", fg: "#1E7A54", dot: "#2FA073" },
  [STATUS.INTERROMPIDO]: { bg: "#FBF1E1", fg: "#93611A", dot: "#D9932E" },
};

const SETOR_ACCENT = {
  recepcao: "#2E7FC7",
  centro: "#2FA073",
  admin: "#93611A",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');`;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function normKey(k) {
  return String(k).trim().toLowerCase().replace(/[\s._]+/g, "");
}

function pickField(row, candidates) {
  const map = {};
  Object.keys(row).forEach((k) => (map[normKey(k)] = row[k]));
  for (const c of candidates) {
    const nk = normKey(c);
    if (map[nk] !== undefined && map[nk] !== null && map[nk] !== "") return map[nk];
  }
  return "";
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val)) {
    const dd = String(val.getDate()).padStart(2, "0");
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const yyyy = val.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(val);
}

function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function agoraLabel() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatCartaoSus(v) {
  const s = String(v || "").replace(/\D/g, "");
  if (s.length !== 15) return v || "";
  return `${s.slice(0, 3)} ${s.slice(3, 7)} ${s.slice(7, 11)} ${s.slice(11, 15)}`;
}

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------

async function loadJSON(key, shared) {
  try {
    const res = await window.storage.get(key, shared);
    if (!res || !res.value) return null;
    return JSON.parse(res.value);
  } catch (e) {
    return null;
  }
}

async function saveJSON(key, value, shared) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Componentes visuais compartilhados
// ---------------------------------------------------------------------------

function TopBar({ title, subtitle, onBack, right }) {
  return (
    <div
      className="no-print"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: HEADER_BG,
        color: "#FFFFFF",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 2px 10px rgba(18,62,107,0.20)",
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.14)",
            border: "none",
            borderRadius: 10,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}

function StatusBadge({ status, small }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE[STATUS.AGENDADO];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        width: "fit-content",
        maxWidth: "100%",
        gap: 5,
        background: s.bg,
        color: s.fg,
        borderRadius: 999,
        padding: small ? "3px 8px" : "5px 12px",
        fontSize: small ? 10.5 : 12.5,
        fontWeight: 600,
        fontFamily: "'IBM Plex Sans', sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 24px", color: "#5E6E6B" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "#EEF2F1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          color: "#0E4340",
        }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15.5, color: "#243B38" }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5, marginTop: 4, maxWidth: 260, marginInline: "auto" }}>{text}</div>
    </div>
  );
}

// Tela de senha genérica (Recepção, Centro Cirúrgico e Administração)
function SenhaGate({ titulo, mensagem, senhaCorreta, accent, onOk, onBack }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);

  const entrar = () => {
    if (senha === senhaCorreta) onOk();
    else setErro(true);
  };

  return (
    <div style={{ minHeight: "100%", background: "#F3F7F6" }}>
      <TopBar title={titulo} onBack={onBack} />
      <div style={{ padding: "40px 24px" }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E3EBE9",
            borderRadius: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: accent + "1A",
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <Lock size={22} />
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: "#1B2E2B" }}>
            Acesso restrito
          </div>
          <div style={{ fontSize: 13, color: "#647975", marginTop: 4 }}>{mensagem}</div>
          <input
            type="password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && entrar()}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "11px 12px",
              borderRadius: 10,
              border: erro ? "1px solid #D9633F" : "1px solid #DCE7E4",
              fontSize: 15,
              textAlign: "center",
              boxSizing: "border-box",
              letterSpacing: 2,
            }}
            placeholder="••••"
          />
          {erro && <div style={{ color: "#A63F2B", fontSize: 12.5, marginTop: 6 }}>Senha incorreta</div>}
          <button
            onClick={entrar}
            style={{
              width: "100%",
              marginTop: 14,
              background: accent,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 0",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela: Menu principal
// ---------------------------------------------------------------------------

function MenuScreen({ pacientes, onNavigate }) {
  const counts = useMemo(() => {
    const c = { total: pacientes.length, pendentes: 0, presentes: 0, finalizados: 0 };
    pacientes.forEach((p) => {
      if (p.status === STATUS.AGENDADO) c.pendentes++;
      else if (p.status === STATUS.PRESENCA) c.presentes++;
      else c.finalizados++;
    });
    return c;
  }, [pacientes]);

  const cards = [
    {
      key: "recepcao-login",
      title: "Recepção",
      desc: "Registrar presença e falta dos pacientes",
      icon: <UserCheck size={22} />,
      accent: SETOR_ACCENT.recepcao,
    },
    {
      key: "centro-login",
      title: "Centro Cirúrgico",
      desc: "Atualizar status do atendimento",
      icon: <Activity size={22} />,
      accent: SETOR_ACCENT.centro,
    },
    {
      key: "admin-login",
      title: "Administração",
      desc: "Carregar base, senhas e indicadores",
      icon: <Lock size={22} />,
      accent: SETOR_ACCENT.admin,
    },
  ];

  return (
    <div style={{ minHeight: "100%", background: "#F3F7F6" }}>
      <div
        className="no-print"
        style={{
          background: HEADER_BG,
          color: "#FFFFFF",
          padding: "28px 20px 40px",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <div style={{ fontSize: 12.5, opacity: 0.75, textTransform: "capitalize", fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {todayLabel()}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 25, marginTop: 4 }}>
          Agenda Facoemulsificação
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Controle de presença e atendimento</div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {[
            { label: "Na base", value: counts.total },
            { label: "Aguardando", value: counts.pendentes },
            { label: "Em cirurgia", value: counts.presentes },
            { label: "Finalizados", value: counts.finalizados },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.10)", borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: 18 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="no-print" style={{ padding: "20px 16px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={() => onNavigate(c.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#FFFFFF",
              border: "1px solid #E3EBE9",
              borderRadius: 16,
              padding: "16px 16px",
              textAlign: "left",
              boxShadow: "0 1px 2px rgba(14,67,64,0.04)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: c.accent + "1A",
                color: c.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15.5, color: "#1B2E2B" }}>
                {c.title}
              </div>
              <div style={{ fontSize: 12.5, color: "#647975", marginTop: 1 }}>{c.desc}</div>
            </div>
            <ChevronRight size={18} color="#B7C4C1" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela: Recepção
// ---------------------------------------------------------------------------

function RecepcaoScreen({ pacientes, onUpdateStatus, onBack }) {
  const [busca, setBusca] = useState("");
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter((p) => !q || p.paciente.toLowerCase().includes(q));
  }, [pacientes, busca]);

  const pendentes = filtrados.filter((p) => p.status === STATUS.AGENDADO);
  const registrados = filtrados.filter((p) => p.status !== STATUS.AGENDADO);

  const marcar = (p, novoStatus) => onUpdateStatus(p.id, { status: novoStatus });
  const desfazer = (p) => onUpdateStatus(p.id, { status: STATUS.AGENDADO });

  return (
    <div style={{ minHeight: "100%", background: "#F3F7F6", paddingBottom: 32 }}>
      <TopBar title="Recepção" subtitle={`${pendentes.length} aguardando chegada`} onBack={onBack} />

      <div className="no-print" style={{ padding: "14px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#8AA09C" }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente pelo nome"
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              borderRadius: 12,
              border: "1px solid #DCE7E4",
              fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              background: "#FFFFFF",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div className="no-print" style={{ padding: "16px 16px 4px" }}>
        {pendentes.length === 0 && registrados.length === 0 ? (
          <EmptyState icon={<ClipboardList size={24} />} title="Nenhum paciente encontrado" text="Verifique a busca ou aguarde a carga da base pela administração." />
        ) : pendentes.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={24} />} title="Todos já foram registrados" text="Não há pacientes aguardando presença no momento." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendentes.map((p) => (
              <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 14, padding: "13px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "#1B2E2B", fontFamily: "'IBM Plex Sans', sans-serif" }}>{p.paciente}</div>
                    <div style={{ fontSize: 12, color: "#6C807C", marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {p.lado ? `Olho ${p.lado} · ` : ""}
                      {formatCartaoSus(p.cartaoSus)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => marcar(p, STATUS.PRESENCA)}
                    style={{ flex: 1, background: "#2FA073", color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <CheckCircle2 size={16} /> Presença
                  </button>
                  <button
                    onClick={() => marcar(p, STATUS.FALTA)}
                    style={{ flex: 1, background: "#FBEAE7", color: "#A63F2B", border: "1px solid #F2CFC7", borderRadius: 10, padding: "9px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <XCircle size={16} /> Faltou
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {registrados.length > 0 && (
        <div className="no-print" style={{ padding: "18px 16px 0" }}>
          <button
            onClick={() => setMostrarFinalizados((v) => !v)}
            style={{ background: "none", border: "none", color: "#0E4340", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, padding: "6px 2px" }}
          >
            <Eye size={15} />
            {mostrarFinalizados ? "Ocultar" : "Ver"} já registrados ({registrados.length})
          </button>

          {mostrarFinalizados && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {registrados.map((p) => (
                <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1B2E2B" }}>{p.paciente}</div>
                    <div style={{ marginTop: 4 }}>
                      <StatusBadge status={p.status} small />
                    </div>
                  </div>
                  {(p.status === STATUS.PRESENCA || p.status === STATUS.FALTA) && (
                    <button
                      onClick={() => desfazer(p)}
                      title="Desfazer registro"
                      style={{ background: "#F3F7F6", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#647975", flexShrink: 0 }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela: Centro Cirúrgico
// ---------------------------------------------------------------------------

function PatientEditor({ valorObs, onChangeObs, onConfirmar, onDesfazer }) {
  return (
    <div style={{ marginTop: 12 }}>
      <textarea
        value={valorObs}
        onChange={(e) => onChangeObs(e.target.value)}
        placeholder="Observações do atendimento (opcional)"
        rows={3}
        style={{ width: "100%", border: "1px solid #DCE7E4", borderRadius: 10, padding: "8px 10px", fontSize: 13.5, fontFamily: "'IBM Plex Sans', sans-serif", resize: "vertical", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => onConfirmar(STATUS.ATENDIDO)}
          style={{ flex: 1, background: "#2FA073", color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <CheckCircle2 size={16} /> Atendido
        </button>
        <button
          onClick={() => onConfirmar(STATUS.INTERROMPIDO)}
          style={{ flex: 1, background: "#FBF1E1", color: "#93611A", border: "1px solid #EFDDB8", borderRadius: 10, padding: "9px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <PauseCircle size={16} /> Interrompido
        </button>
      </div>
      {onDesfazer && (
        <button
          onClick={onDesfazer}
          style={{ width: "100%", marginTop: 8, background: "none", border: "none", color: "#647975", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 0" }}
        >
          <RotateCcw size={13} /> Desfazer e voltar para aguardando
        </button>
      )}
    </div>
  );
}

function CentroCirurgicoScreen({ pacientes, onUpdateStatus, onBack }) {
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(null);
  const [obsRascunho, setObsRascunho] = useState("");
  const [mostrarFinalizados, setMostrarFinalizados] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter((p) => !q || p.paciente.toLowerCase().includes(q));
  }, [pacientes, busca]);

  const emEspera = filtrados.filter((p) => p.status === STATUS.PRESENCA);
  const finalizados = filtrados.filter((p) => p.status === STATUS.ATENDIDO || p.status === STATUS.INTERROMPIDO);

  const abrir = (p) => {
    setAtivo(p.id);
    setObsRascunho(p.obs || "");
  };
  const fechar = () => {
    setAtivo(null);
    setObsRascunho("");
  };
  const confirmar = (p, novoStatus) => {
    onUpdateStatus(p.id, { status: novoStatus, obs: obsRascunho });
    fechar();
  };
  const desfazer = (p) => {
    onUpdateStatus(p.id, { status: STATUS.PRESENCA, obs: obsRascunho });
    fechar();
  };

  return (
    <div style={{ minHeight: "100%", background: "#F3F7F6", paddingBottom: 32 }}>
      <TopBar title="Centro Cirúrgico" subtitle={`${emEspera.length} aguardando atendimento`} onBack={onBack} />

      <div className="no-print" style={{ padding: "14px 16px 0" }}>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#8AA09C" }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente pelo nome"
            style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 12, border: "1px solid #DCE7E4", fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", background: "#FFFFFF", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <div className="no-print" style={{ padding: "16px 16px 4px" }}>
        {emEspera.length === 0 ? (
          <EmptyState icon={<Activity size={24} />} title="Nenhum paciente aguardando" text="Pacientes aparecem aqui após a presença ser confirmada na recepção." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {emEspera.map((p) => {
              const aberto = ativo === p.id;
              return (
                <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 14, padding: "13px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, cursor: "pointer" }} onClick={() => (aberto ? fechar() : abrir(p))}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5, color: "#1B2E2B", fontFamily: "'IBM Plex Sans', sans-serif" }}>{p.paciente}</div>
                      <div style={{ fontSize: 12, color: "#6C807C", marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {p.lado ? `Olho ${p.lado} · ` : ""}
                        {formatCartaoSus(p.cartaoSus)}
                      </div>
                    </div>
                    <ChevronRight size={18} color="#B7C4C1" style={{ transform: aberto ? "rotate(90deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
                  </div>
                  {aberto && (
                    <PatientEditor valorObs={obsRascunho} onChangeObs={setObsRascunho} onConfirmar={(status) => confirmar(p, status)} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {finalizados.length > 0 && (
        <div className="no-print" style={{ padding: "18px 16px 0" }}>
          <button
            onClick={() => setMostrarFinalizados((v) => !v)}
            style={{ background: "none", border: "none", color: "#0E4340", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, padding: "6px 2px" }}
          >
            <Eye size={15} />
            {mostrarFinalizados ? "Ocultar" : "Ver"} finalizados ({finalizados.length})
          </button>

          {mostrarFinalizados && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {finalizados.map((p) => {
                const aberto = ativo === p.id;
                return (
                  <div key={p.id} style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 12, padding: "11px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, cursor: "pointer" }} onClick={() => (aberto ? fechar() : abrir(p))}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1B2E2B" }}>{p.paciente}</div>
                        <div style={{ marginTop: 5 }}>
                          <StatusBadge status={p.status} small />
                        </div>
                        {p.obs && !aberto && <div style={{ fontSize: 12, color: "#647975", marginTop: 6 }}>{p.obs}</div>}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          aberto ? fechar() : abrir(p);
                        }}
                        title="Editar"
                        style={{ background: "#F3F7F6", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#0E4340", flexShrink: 0 }}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    {aberto && (
                      <PatientEditor valorObs={obsRascunho} onChangeObs={setObsRascunho} onConfirmar={(status) => confirmar(p, status)} onDesfazer={() => desfazer(p)} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela: Administração
// ---------------------------------------------------------------------------

function SenhasPanel({ senhas, onSalvar }) {
  const [form, setForm] = useState({ recepcao: "", centro: "", admin: "" });
  const [salvo, setSalvo] = useState(false);

  const campo = (chave, label) => (
    <div key={chave} style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: "#3E504D", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <input
        type="text"
        value={form[chave]}
        onChange={(e) => {
          setForm((f) => ({ ...f, [chave]: e.target.value }));
          setSalvo(false);
        }}
        placeholder={`Senha atual: ${senhas[chave]}`}
        style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid #DCE7E4", fontSize: 14, boxSizing: "border-box" }}
      />
    </div>
  );

  const salvar = () => {
    const novo = { ...senhas };
    let mudou = false;
    Object.keys(form).forEach((k) => {
      if (form[k].trim()) {
        novo[k] = form[k].trim();
        mudou = true;
      }
    });
    if (mudou) {
      onSalvar(novo);
      setForm({ recepcao: "", centro: "", admin: "" });
      setSalvo(true);
    }
  };

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 16, padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <KeyRound size={16} color="#93611A" />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: "#1B2E2B" }}>
          Senhas de acesso
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "#647975", marginBottom: 12 }}>
        Deixe em branco o que não quiser alterar. Preencha só o setor cuja senha deseja redefinir.
      </div>
      {campo("recepcao", "Recepção")}
      {campo("centro", "Centro Cirúrgico")}
      {campo("admin", "Administração")}
      <button
        onClick={salvar}
        style={{ width: "100%", marginTop: 4, background: "#93611A", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        <Save size={15} /> Salvar senhas
      </button>
      {salvo && <div style={{ color: "#1E7A54", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>Senha(s) atualizada(s) com sucesso.</div>}
    </div>
  );
}

function AdminPanel({ pacientes, onCarregarBase, onBack, ultimaCarga, senhas, onSalvarSenhas }) {
  const fileRef = useRef(null);
  const [carregando, setCarregando] = useState(false);
  const [erroUpload, setErroUpload] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");

  const counts = useMemo(() => {
    const base = { [STATUS.AGENDADO]: 0, [STATUS.PRESENCA]: 0, [STATUS.FALTA]: 0, [STATUS.ATENDIDO]: 0, [STATUS.INTERROMPIDO]: 0 };
    pacientes.forEach((p) => (base[p.status] = (base[p.status] || 0) + 1));
    return base;
  }, [pacientes]);

  const maxCount = Math.max(1, ...Object.values(counts));

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pacientes.filter((p) => {
      const passaStatus = filtroStatus === "Todos" || p.status === filtroStatus;
      const passaBusca = !q || p.paciente.toLowerCase().includes(q);
      return passaStatus && passaBusca;
    });
  }, [pacientes, filtroStatus, busca]);

  const exportarPlanilha = () => {
    const dataHoje = new Date().toISOString().slice(0, 10);

    // Aba 1: pacientes com as movimentações já registradas pelos setores
    const linhasPacientes = pacientes.map((p) => ({
      PACIENTE: p.paciente,
      CARTAO_SUS: p.cartaoSus,
      LADO: p.lado,
      DT_ATEND: p.dtAtend,
      APAC: p.apac,
      "BAIXA ATEND. SIGA": p.baixaSiga,
      STATUS: p.status,
      OBSERVACAO: p.obs || "",
    }));
    const wsPacientes = XLSX.utils.json_to_sheet(linhasPacientes);
    wsPacientes["!cols"] = [
      { wch: 30 }, { wch: 18 }, { wch: 6 }, { wch: 12 },
      { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 34 },
    ];

    // Aba 2: resumo por status, com gráfico de barras em texto (compatível com qualquer Excel)
    const maxContagem = Math.max(1, ...Object.values(counts));
    const linhasResumo = Object.values(STATUS).map((s) => ({
      STATUS: s,
      PACIENTES: counts[s] || 0,
      GRAFICO: barraTexto(counts[s] || 0, maxContagem),
    }));
    linhasResumo.push({ STATUS: "TOTAL", PACIENTES: pacientes.length, GRAFICO: "" });
    const wsResumo = XLSX.utils.json_to_sheet(linhasResumo);
    wsResumo["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: BARRA_MAX_CARACTERES + 2 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");
    XLSX.utils.book_append_sheet(wb, wsPacientes, "Pacientes");
    XLSX.writeFile(wb, `agenda-faco_${dataHoje}.xlsx`);
  };

  const processarArquivo = async (file) => {
    setErroUpload("");
    setCarregando(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        setErroUpload("A planilha está vazia.");
        setCarregando(false);
        return;
      }

      const novaBase = rows
        .map((row) => {
          const paciente = String(pickField(row, ["PACIENTE", "NOME", "NOME DO PACIENTE"])).trim();
          if (!paciente) return null;
          return {
            id: uid(),
            paciente,
            cartaoSus: String(pickField(row, ["CARTAO_SUS", "CARTAO SUS", "CNS"])).trim(),
            lado: String(pickField(row, ["LADO", "OLHO"])).trim().toUpperCase(),
            dtAtend: formatDate(pickField(row, ["DT_ATEND", "DATA", "DATA ATENDIMENTO"])),
            apac: String(pickField(row, ["APAC"])).trim(),
            baixaSiga: String(pickField(row, ["BAIXA ATEND. SIGA", "BAIXA ATEND SIGA", "SIGA"])).trim(),
            status: STATUS.AGENDADO,
            obs: "",
          };
        })
        .filter(Boolean);

      if (!novaBase.length) {
        setErroUpload("Não encontrei a coluna PACIENTE na planilha. Verifique o modelo.");
        setCarregando(false);
        return;
      }

      await onCarregarBase(novaBase);
      setConfirmando(false);
    } catch (e) {
      setErroUpload("Não consegui ler esse arquivo. Verifique se é o modelo .xlsx.");
    }
    setCarregando(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ minHeight: "100%", background: "#F3F7F6", paddingBottom: 40 }}>
      <TopBar title="Administração" subtitle={`${pacientes.length} pacientes na base atual`} onBack={onBack} />

      <div className="no-print" style={{ padding: 16 }}>
        {/* Upload */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: "#1B2E2B" }}>Carregar nova base</div>
          <div style={{ fontSize: 12.5, color: "#647975", marginTop: 3 }}>
            Envie a planilha do dia (mesmo modelo). Isso substitui toda a base atual.
            {ultimaCarga && (
              <>
                {" "}
                Última carga: <strong>{ultimaCarga}</strong>.
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (pacientes.length > 0) setConfirmando(f);
                else processarArquivo(f);
              }
            }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={carregando}
            style={{ width: "100%", marginTop: 12, background: "#0E4340", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {carregando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {carregando ? "Processando..." : "Selecionar planilha (.xlsx)"}
          </button>

          {erroUpload && <div style={{ color: "#A63F2B", fontSize: 12.5, marginTop: 8 }}>{erroUpload}</div>}
        </div>

        {confirmando && (
          <div style={{ marginTop: 12, background: "#FBF1E1", border: "1px solid #EFDDB8", borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13.5, color: "#5B3E10", fontWeight: 600 }}>Substituir a base atual?</div>
            <div style={{ fontSize: 12.5, color: "#7A5A20", marginTop: 4 }}>
              A base atual tem {pacientes.length} pacientes e será totalmente substituída pelo conteúdo desta planilha, incluindo os status já registrados hoje.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => processarArquivo(confirmando)} style={{ flex: 1, background: "#93611A", color: "#fff", border: "none", borderRadius: 9, padding: "9px 0", fontWeight: 600, fontSize: 13 }}>
                Substituir base
              </button>
              <button
                onClick={() => {
                  setConfirmando(false);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                style={{ flex: 1, background: "#fff", color: "#7A5A20", border: "1px solid #EFDDB8", borderRadius: 9, padding: "9px 0", fontWeight: 600, fontSize: 13 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Planilha atualizada com as movimentações */}
        <button
          onClick={exportarPlanilha}
          style={{ width: "100%", marginTop: 14, background: "#FFFFFF", color: "#0E4340", border: "1px solid #E3EBE9", borderRadius: 12, padding: "11px 0", fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <FileDown size={16} /> Baixar planilha atualizada (.xlsx)
        </button>

        {/* Senhas */}
        <SenhasPanel senhas={senhas} onSalvar={onSalvarSenhas} />

        {/* Indicadores */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 16, padding: 16, marginTop: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: "#1B2E2B", marginBottom: 12 }}>Indicadores do dia</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(counts).map(([status, n]) => {
              const s = STATUS_STYLE[status];
              return (
                <div key={status}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: "#3E504D", fontWeight: 500 }}>{status}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#3E504D" }}>{n}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#EEF2F1", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(n / maxCount) * 100}%`, background: s.dot, borderRadius: 999, transition: "width .3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista completa */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E3EBE9", borderRadius: 16, padding: 16, marginTop: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: "#1B2E2B", marginBottom: 10 }}>Todos os pacientes</div>

          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: "#8AA09C" }} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo nome"
              style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 10, border: "1px solid #DCE7E4", fontSize: 13.5, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}>
            {["Todos", ...Object.values(STATUS)].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                style={{ flexShrink: 0, padding: "6px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: filtroStatus === s ? "1px solid #0E4340" : "1px solid #DCE7E4", background: filtroStatus === s ? "#0E4340" : "#fff", color: filtroStatus === s ? "#fff" : "#3E504D" }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6, maxHeight: 420, overflowY: "auto" }}>
            {listaFiltrada.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#8AA09C", fontSize: 13 }}>Nenhum paciente encontrado.</div>
            ) : (
              listaFiltrada.map((p) => (
                <div key={p.id} style={{ border: "1px solid #EEF2F1", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1B2E2B" }}>{p.paciente}</div>
                  <div style={{ fontSize: 11.5, color: "#6C807C", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                    {p.lado ? `${p.lado} · ` : ""}
                    {formatCartaoSus(p.cartaoSus)} {p.dtAtend && `· ${p.dtAtend}`}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <StatusBadge status={p.status} small />
                  </div>
                  {p.obs && <div style={{ fontSize: 12, color: "#647975", marginTop: 6 }}>{p.obs}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App principal
// ---------------------------------------------------------------------------

export default function AgendaFacoApp() {
  const [tela, setTela] = useState("menu");
  const [pacientes, setPacientes] = useState([]);
  const [ultimaCarga, setUltimaCarga] = useState("");
  const [senhas, setSenhas] = useState(SENHAS_PADRAO);
  const [pronto, setPronto] = useState(false);
  const [erroPersistencia, setErroPersistencia] = useState(false);

  useEffect(() => {
    (async () => {
      const [dados, senhasSalvas] = await Promise.all([loadJSON(BASE_KEY, true), loadJSON(SENHAS_KEY, true)]);
      if (dados) {
        setPacientes(dados.pacientes || []);
        setUltimaCarga(dados.ultimaCarga || "");
      }
      if (senhasSalvas) setSenhas({ ...SENHAS_PADRAO, ...senhasSalvas });
      setPronto(true);
    })();
  }, []);

  const persistirBase = useCallback(
    async (novaLista, novaCarga) => {
      const payload = { pacientes: novaLista, ultimaCarga: novaCarga ?? ultimaCarga };
      const ok = await saveJSON(BASE_KEY, payload, true);
      setErroPersistencia(!ok);
    },
    [ultimaCarga]
  );

  const handleUpdateStatus = useCallback(
    (id, changes) => {
      setPacientes((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...changes } : p));
        persistirBase(next);
        return next;
      });
    },
    [persistirBase]
  );

  const handleCarregarBase = useCallback(
    async (novaBase) => {
      const carimbo = agoraLabel();
      setPacientes(novaBase);
      setUltimaCarga(carimbo);
      await persistirBase(novaBase, carimbo);
    },
    [persistirBase]
  );

  const handleSalvarSenhas = useCallback(async (novasSenhas) => {
    setSenhas(novasSenhas);
    await saveJSON(SENHAS_KEY, novasSenhas, true);
  }, []);

  if (!pronto) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F7F6", color: "#647975" }}>
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7F6", fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 480, margin: "0 auto", boxShadow: "0 0 40px rgba(14,67,64,0.06)" }}>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input:focus, textarea:focus { outline: 2px solid #2E7FC7; outline-offset: 1px; }
        button:focus-visible { outline: 2px solid #2E7FC7; outline-offset: 1px; }
        .animate-spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {erroPersistencia && (
        <div className="no-print" style={{ background: "#FBEAE7", color: "#A63F2B", fontSize: 12, textAlign: "center", padding: "6px 10px" }}>
          Não foi possível salvar a última alteração. Verifique a conexão.
        </div>
      )}

      {tela === "menu" && <MenuScreen pacientes={pacientes} onNavigate={setTela} />}

      {tela === "recepcao-login" && (
        <SenhaGate titulo="Recepção" mensagem="Informe a senha de acesso" senhaCorreta={senhas.recepcao} accent={SETOR_ACCENT.recepcao} onOk={() => setTela("recepcao-panel")} onBack={() => setTela("menu")} />
      )}
      {tela === "recepcao-panel" && <RecepcaoScreen pacientes={pacientes} onUpdateStatus={handleUpdateStatus} onBack={() => setTela("menu")} />}

      {tela === "centro-login" && (
        <SenhaGate titulo="Centro Cirúrgico" mensagem="Informe a senha de acesso" senhaCorreta={senhas.centro} accent={SETOR_ACCENT.centro} onOk={() => setTela("centro-panel")} onBack={() => setTela("menu")} />
      )}
      {tela === "centro-panel" && <CentroCirurgicoScreen pacientes={pacientes} onUpdateStatus={handleUpdateStatus} onBack={() => setTela("menu")} />}

      {tela === "admin-login" && (
        <SenhaGate titulo="Administração" mensagem="Informe a senha de administrador" senhaCorreta={senhas.admin} accent={SETOR_ACCENT.admin} onOk={() => setTela("admin-panel")} onBack={() => setTela("menu")} />
      )}
      {tela === "admin-panel" && (
        <AdminPanel pacientes={pacientes} onCarregarBase={handleCarregarBase} onBack={() => setTela("menu")} ultimaCarga={ultimaCarga} senhas={senhas} onSalvarSenhas={handleSalvarSenhas} />
      )}
    </div>
  );
}
