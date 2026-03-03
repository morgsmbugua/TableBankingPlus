import { useState, useMemo } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) =>
  "KES " + Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LOAN_INTEREST = 0.015;   // 1.5% monthly
const ADV_INTEREST  = 0.10;    // 10% monthly
const LOAN_MULT     = 2.5;     // max loan = 2.5× shares

// ── initial state ─────────────────────────────────────────────────────────────
const initState = () => {
  try {
    const s = localStorage.getItem("tb_data");
    if (s) return JSON.parse(s);
  } catch {}
  return { groups: {}, members: {}, memberships: [] };
  // groups: { [gid]: { id, name, area } }
  // members: { [mid]: { id, name, idNo, phone } }
  // memberships: [{ id, gid, mid, memberNo, transactions: [] }]
  // transaction: { id, date, type, amount, note }
  // types: SHARES_DEP | SHARES_WD | LOAN_ISSUED | LOAN_PAID | ADV_ISSUED | ADV_PAID
};

const save = (state) => {
  try { localStorage.setItem("tb_data", JSON.stringify(state)); } catch {}
};

// ── derived calcs ─────────────────────────────────────────────────────────────
const calcMembership = (ms) => {
  let shares = 0, loanBalance = 0, advBalance = 0;
  for (const t of ms.transactions) {
    if (t.type === "SHARES_DEP") shares += t.amount;
    if (t.type === "SHARES_WD")  shares -= t.amount;
    if (t.type === "LOAN_ISSUED") loanBalance += t.amount;
    if (t.type === "LOAN_PAID")   loanBalance -= t.amount;
    if (t.type === "ADV_ISSUED")  advBalance += t.amount;
    if (t.type === "ADV_PAID")    advBalance -= t.amount;
  }
  const loanInterest = loanBalance > 0 ? loanBalance * LOAN_INTEREST : 0;
  const advInterest  = advBalance  > 0 ? advBalance  * ADV_INTEREST  : 0;
  const maxLoan = shares * LOAN_MULT;
  return { shares, loanBalance, advBalance, loanInterest, advInterest, maxLoan };
};

// ── components ────────────────────────────────────────────────────────────────

const Badge = ({ children, color = "#2d6a4f" }) => (
  <span style={{
    background: color + "18", color, border: `1px solid ${color}40`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.04em", textTransform: "uppercase"
  }}>{children}</span>
);

const Input = ({ label, ...props }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</label>}
    <input {...props} style={{
      border: "1.5px solid #e0e0e0", borderRadius: 6, padding: "9px 12px",
      fontSize: 14, fontFamily: "inherit", outline: "none", background: "#fafafa",
      transition: "border-color 0.15s", ...props.style
    }}
      onFocus={e => e.target.style.borderColor = "#2d6a4f"}
      onBlur={e => e.target.style.borderColor = "#e0e0e0"}
    />
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style = {}, disabled }) => {
  const styles = {
    primary:   { background: "#2d6a4f", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#2d6a4f", border: "1.5px solid #2d6a4f" },
    danger:    { background: "#fff", color: "#c0392b", border: "1.5px solid #c0392b" },
    ghost:     { background: "transparent", color: "#666", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 6, padding: "9px 18px",
      fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", letterSpacing: "0.03em", opacity: disabled ? 0.5 : 1,
      transition: "opacity 0.15s, transform 0.1s", ...style
    }}
      onMouseEnter={e => { if (!disabled) e.target.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.target.style.opacity = "1"; }}
    >{children}</button>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", border: "1.5px solid #ebebeb", borderRadius: 10,
    padding: "20px 24px", ...style
  }}>{children}</div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, background: "#00000040", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16
  }} onClick={onClose}>
    <div style={{
      background: "#fff", borderRadius: 12, padding: 28, minWidth: 340, maxWidth: 480,
      width: "100%", maxHeight: "90vh", overflowY: "auto",
      boxShadow: "0 20px 60px #0002"
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#999", lineHeight: 1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

const StatBox = ({ label, value, sub }) => (
  <div style={{ padding: "14px 18px", background: "#f7faf8", borderRadius: 8, border: "1px solid #e8f0ec" }}>
    <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setStateRaw] = useState(initState);
  const [tab, setTab] = useState("groups"); // groups | search | totals
  const [modal, setModal] = useState(null);
  // modal types: addGroup | addMember(gid) | memberDetail(mid,gid) | txn(msId)

  const setState = (fn) => {
    setStateRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(next);
      return next;
    });
  };

  // ── group actions
  const addGroup = (name, area) => {
    const id = uid();
    setState(s => ({ ...s, groups: { ...s.groups, [id]: { id, name, area } } }));
  };

  const addMember = (gid, name, idNo, phone, memberNo) => {
    // find or create member by idNo
    let mid = Object.values(state.members).find(m => m.idNo === idNo)?.id;
    if (!mid) {
      mid = uid();
      setState(s => ({ ...s, members: { ...s.members, [mid]: { id: mid, name, idNo, phone } } }));
    }
    // create membership
    const msId = uid();
    setState(s => ({
      ...s,
      memberships: [...s.memberships, { id: msId, gid, mid, memberNo, transactions: [] }]
    }));
  };

  const addTransaction = (msId, type, amount, note) => {
    setState(s => ({
      ...s,
      memberships: s.memberships.map(ms =>
        ms.id !== msId ? ms : {
          ...ms,
          transactions: [...ms.transactions, {
            id: uid(), date: new Date().toISOString(), type,
            amount: parseFloat(amount), note
          }]
        }
      )
    }));
  };

  // ── derived
  const groupMemberships = (gid) => state.memberships.filter(ms => ms.gid === gid);

  const groupStats = (gid) => {
    const msList = groupMemberships(gid);
    let totalShares = 0, totalLoans = 0, totalAdv = 0;
    for (const ms of msList) {
      const c = calcMembership(ms);
      totalShares += c.shares;
      totalLoans  += c.loanBalance;
      totalAdv    += c.advBalance;
    }
    const balance = totalShares - totalLoans - totalAdv;
    return { totalShares, totalLoans, totalAdv, balance, count: msList.length };
  };

  const allGroupsStats = () => {
    let totalShares = 0, totalLoans = 0, totalAdv = 0, balance = 0;
    for (const gid of Object.keys(state.groups)) {
      const s = groupStats(gid);
      totalShares += s.totalShares;
      totalLoans  += s.totalLoans;
      totalAdv    += s.totalAdv;
      balance     += s.balance;
    }
    return { totalShares, totalLoans, totalAdv, balance, groups: Object.keys(state.groups).length };
  };

  return (
    <div style={{ fontFamily: "'Outfit', 'Segoe UI', sans-serif", minHeight: "100vh", background: "#f5f5f0", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#2d6a4f", padding: "0 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>TableBank</div>
            <div style={{ color: "#95d5b2", fontSize: 11, marginTop: -2 }}>Group Finance Manager</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["groups", "Groups"], ["search", "Search"], ["totals", "All Totals"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? "#2d6a4f" : "#b7e4c7",
                border: "none", borderRadius: 6, padding: "6px 14px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        {tab === "groups" && <GroupsTab state={state} modal={modal} setModal={setModal} groupStats={groupStats} addGroup={addGroup} addMember={addMember} addTransaction={addTransaction} calcMembership={calcMembership} />}
        {tab === "search" && <SearchTab state={state} setModal={setModal} calcMembership={calcMembership} />}
        {tab === "totals" && <TotalsTab state={state} allGroupsStats={allGroupsStats} groupStats={groupStats} />}
      </div>

      {/* Modals */}
      {modal?.type === "addGroup" && <AddGroupModal onClose={() => setModal(null)} onSave={addGroup} />}
      {modal?.type === "addMember" && <AddMemberModal gid={modal.gid} state={state} onClose={() => setModal(null)} onSave={addMember} />}
      {modal?.type === "memberDetail" && <MemberDetailModal msId={modal.msId} state={state} onClose={() => setModal(null)} addTransaction={addTransaction} calcMembership={calcMembership} />}
    </div>
  );
}

// ── GROUPS TAB ────────────────────────────────────────────────────────────────
function GroupsTab({ state, setModal, groupStats, addGroup, addMember, addTransaction, calcMembership }) {
  const [openGid, setOpenGid] = useState(null);
  const groups = Object.values(state.groups);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Groups</h2>
          <p style={{ margin: 0, color: "#888", fontSize: 13 }}>{groups.length} registered group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <Btn onClick={() => setModal({ type: "addGroup" })}>+ New Group</Btn>
      </div>

      {groups.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48, color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
          <div style={{ fontWeight: 600 }}>No groups yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Create your first group to get started</div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map(g => {
          const stats = groupStats(g.id);
          const isOpen = openGid === g.id;
          const members = state.memberships.filter(ms => ms.gid === g.id);
          return (
            <Card key={g.id}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setOpenGid(isOpen ? null : g.id)}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{g.area} · {stats.count} member{stats.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#888" }}>Balance</div>
                    <div style={{ fontWeight: 700, color: stats.balance >= 0 ? "#2d6a4f" : "#c0392b" }}>{fmt(stats.balance)}</div>
                  </div>
                  <span style={{ color: "#aaa", fontSize: 18, transition: "transform 0.2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ marginTop: 20, borderTop: "1px solid #f0f0f0", paddingTop: 20 }}>
                  {/* group stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                    <StatBox label="Total Shares" value={fmt(stats.totalShares)} />
                    <StatBox label="Loans Out" value={fmt(stats.totalLoans)} />
                    <StatBox label="Advances Out" value={fmt(stats.totalAdv)} />
                    <StatBox label="Group Balance" value={fmt(stats.balance)} />
                  </div>

                  {/* members list */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Members</span>
                    <Btn variant="secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setModal({ type: "addMember", gid: g.id })}>+ Add Member</Btn>
                  </div>

                  {members.length === 0 && <div style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No members yet</div>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {members.map(ms => {
                      const mem = state.members[ms.mid];
                      const calc = calcMembership(ms);
                      return (
                        <div key={ms.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", background: "#f9fafb", borderRadius: 8,
                          border: "1px solid #ebebeb", cursor: "pointer"
                        }} onClick={() => setModal({ type: "memberDetail", msId: ms.id })}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{mem?.name}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>#{ms.memberNo} · {mem?.phone}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 12, color: "#888" }}>Shares</div>
                            <div style={{ fontWeight: 600, color: "#2d6a4f", fontSize: 14 }}>{fmt(calc.shares)}</div>
                            {calc.loanBalance > 0 && <Badge color="#e67e22">Loan: {fmt(calc.loanBalance)}</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── SEARCH TAB ────────────────────────────────────────────────────────────────
function SearchTab({ state, setModal, calcMembership }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return Object.values(state.members).filter(m =>
      m.name.toLowerCase().includes(lq) ||
      m.idNo.toLowerCase().includes(lq) ||
      m.phone.toLowerCase().includes(lq) ||
      state.memberships.some(ms => ms.mid === m.id && ms.memberNo.toString().toLowerCase().includes(lq))
    );
  }, [q, state]);

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700 }}>Search Member</h2>
      <Input label="Search by name, ID number, phone, or member number" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. John, 12345678, 0712..." />

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {q.trim() && results.length === 0 && <div style={{ color: "#aaa", textAlign: "center", padding: 32 }}>No members found</div>}
        {results.map(mem => {
          const memberships = state.memberships.filter(ms => ms.mid === mem.id);
          return (
            <Card key={mem.id}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{mem.name}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>ID: {mem.idNo} · Phone: {mem.phone}</div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {memberships.map(ms => {
                  const g = state.groups[ms.gid];
                  const calc = calcMembership(ms);
                  return (
                    <div key={ms.id} style={{
                      padding: "10px 14px", background: "#f9fafb", borderRadius: 8,
                      border: "1px solid #ebebeb", cursor: "pointer"
                    }} onClick={() => setModal({ type: "memberDetail", msId: ms.id })}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{g?.name}</div>
                          <div style={{ fontSize: 12, color: "#888" }}>{g?.area} · Member #{ms.memberNo}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: "#888" }}>Shares</div>
                          <div style={{ fontWeight: 700, color: "#2d6a4f" }}>{fmt(calc.shares)}</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 }}>
                        <div style={{ fontSize: 12 }}><span style={{ color: "#888" }}>Loan: </span><b>{fmt(calc.loanBalance)}</b></div>
                        <div style={{ fontSize: 12 }}><span style={{ color: "#888" }}>Advance: </span><b>{fmt(calc.advBalance)}</b></div>
                        <div style={{ fontSize: 12 }}><span style={{ color: "#888" }}>Interest: </span><b>{fmt(calc.loanInterest + calc.advInterest)}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── TOTALS TAB ────────────────────────────────────────────────────────────────
function TotalsTab({ state, allGroupsStats, groupStats }) {
  const all = allGroupsStats();
  const groups = Object.values(state.groups);
  return (
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>All Groups — Totals</h2>
      <p style={{ margin: "0 0 20px", color: "#888", fontSize: 13 }}>{all.groups} group{all.groups !== 1 ? "s" : ""} combined</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatBox label="Total Shares" value={fmt(all.totalShares)} />
        <StatBox label="Total Loans" value={fmt(all.totalLoans)} />
        <StatBox label="Total Advances" value={fmt(all.totalAdv)} />
        <StatBox label="Net Balance" value={fmt(all.balance)} />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Breakdown by Group</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map(g => {
          const s = groupStats(g.id);
          return (
            <Card key={g.id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{g.area} · {s.count} members</div>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13 }}><span style={{ color: "#888" }}>Shares </span><b>{fmt(s.totalShares)}</b></div>
                  <div style={{ fontSize: 13 }}><span style={{ color: "#888" }}>Loans </span><b>{fmt(s.totalLoans)}</b></div>
                  <div style={{ fontSize: 13 }}><span style={{ color: "#888" }}>Balance </span><b style={{ color: s.balance >= 0 ? "#2d6a4f" : "#c0392b" }}>{fmt(s.balance)}</b></div>
                </div>
              </div>
            </Card>
          );
        })}
        {groups.length === 0 && <div style={{ color: "#aaa", textAlign: "center", padding: 32 }}>No groups yet</div>}
      </div>
    </div>
  );
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function AddGroupModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  return (
    <Modal title="Register New Group" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Group Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Umoja Savings Group" />
        <Input label="Area / Location" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Naivasha, Nakuru" />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn disabled={!name.trim() || !area.trim()} onClick={() => { onSave(name.trim(), area.trim()); onClose(); }}>Save Group</Btn>
        </div>
      </div>
    </Modal>
  );
}

function AddMemberModal({ gid, state, onClose, onSave }) {
  const [name, setName] = useState("");
  const [idNo, setIdNo] = useState("");
  const [phone, setPhone] = useState("");
  const [memberNo, setMemberNo] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name || !idNo || !phone || !memberNo) { setError("All fields are required."); return; }
    const exists = state.memberships.some(ms => ms.gid === gid && ms.memberNo === memberNo);
    if (exists) { setError("Member number already used in this group."); return; }
    onSave(gid, name.trim(), idNo.trim(), phone.trim(), memberNo.trim());
    onClose();
  };

  return (
    <Modal title="Register Member" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Wanjiku" />
        <Input label="ID Number" value={idNo} onChange={e => setIdNo(e.target.value)} placeholder="12345678" />
        <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" />
        <Input label="Member Number" value={memberNo} onChange={e => setMemberNo(e.target.value)} placeholder="e.g. 001" />
        {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit}>Add Member</Btn>
        </div>
      </div>
    </Modal>
  );
}

function MemberDetailModal({ msId, state, onClose, addTransaction, calcMembership }) {
  const ms = state.memberships.find(m => m.id === msId);
  const mem = ms ? state.members[ms.mid] : null;
  const group = ms ? state.groups[ms.gid] : null;
  const [txnType, setTxnType] = useState("SHARES_DEP");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!ms || !mem) return null;
  const calc = calcMembership(ms);

  const txnLabels = {
    SHARES_DEP: "Shares Deposit",
    SHARES_WD: "Shares Withdrawal",
    LOAN_ISSUED: "Loan Issued",
    LOAN_PAID: "Loan Payment",
    ADV_ISSUED: "Advance Issued",
    ADV_PAID: "Advance Payment",
  };

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (txnType === "LOAN_ISSUED" && amt > calc.maxLoan) {
      setError(`Max loan is ${fmt(calc.maxLoan)} (2.5× shares).`); return;
    }
    if (txnType === "SHARES_WD" && amt > calc.shares) {
      setError("Withdrawal exceeds available shares."); return;
    }
    setError("");
    addTransaction(msId, txnType, amt, note);
    setAmount(""); setNote("");
  };

  return (
    <Modal title="Member Details" onClose={onClose}>
      <div style={{ marginBottom: 16, padding: "12px 16px", background: "#f7faf8", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{mem.name}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          {group?.name} · #{ms.memberNo} · ID: {mem.idNo} · {mem.phone}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        <StatBox label="Total Shares" value={fmt(calc.shares)} sub={`Max loan: ${fmt(calc.maxLoan)}`} />
        <StatBox label="Loan Balance" value={fmt(calc.loanBalance)} sub={calc.loanBalance > 0 ? `Interest: ${fmt(calc.loanInterest)}/mo` : "No active loan"} />
        <StatBox label="Advance Balance" value={fmt(calc.advBalance)} sub={calc.advBalance > 0 ? `Interest: ${fmt(calc.advInterest)}/mo` : "No active advance"} />
        <StatBox label="Total Interest" value={fmt(calc.loanInterest + calc.advInterest)} sub="Per month" />
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Record Transaction</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", letterSpacing: "0.05em", textTransform: "uppercase" }}>Type</label>
          <select value={txnType} onChange={e => { setTxnType(e.target.value); setError(""); }} style={{
            border: "1.5px solid #e0e0e0", borderRadius: 6, padding: "9px 12px",
            fontSize: 14, fontFamily: "inherit", background: "#fafafa", outline: "none"
          }}>
            {Object.entries(txnLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <Input label="Amount (KES)" type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} placeholder="0.00" />
        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. June contribution" />
        {error && <div style={{ color: "#c0392b", fontSize: 13 }}>{error}</div>}
        <Btn onClick={submit} disabled={!amount}>Record</Btn>
      </div>

      {/* Transaction history */}
      {ms.transactions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Transaction History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
            {[...ms.transactions].reverse().map(t => (
              <div key={t.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 12px", background: "#f9fafb", borderRadius: 6, fontSize: 13
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{txnLabels[t.type]}</div>
                  <div style={{ color: "#aaa", fontSize: 11 }}>{new Date(t.date).toLocaleDateString("en-KE")} {t.note && `· ${t.note}`}</div>
                </div>
                <div style={{ fontWeight: 700, color: ["SHARES_WD","LOAN_ISSUED","ADV_ISSUED"].includes(t.type) ? "#c0392b" : "#2d6a4f" }}>
                  {["SHARES_WD","LOAN_ISSUED","ADV_ISSUED"].includes(t.type) ? "−" : "+"}{fmt(t.amount).replace("KES ", "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
