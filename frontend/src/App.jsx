import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, Upload, Camera, Activity, LogIn, UserPlus, ScanLine, Database, Eye, AlertTriangle } from "lucide-react";
import { analyzeDocument, analyzeLiveFrame, matchLiveFace, health, signup, login, history } from "./api";

function Pill({children, tone=""}) { return <span className={`pill ${tone}`}>{children}</span>; }

function Score({value}) {
  const tone = value < 25 ? "good" : value < 55 ? "warn" : "bad";
  return <div className={`score ${tone}`}><strong>{value}</strong><span>/100</span></div>;
}

function Auth({onAuth}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (loading) return;
    setMsg("");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : signup;
      const data = await fn(email, password);
      if (mode === "signup") {
        setMsg("Account created. You can now sign in.");
        setMode("login");
        setPassword("");
      } else onAuth(data.user);
    } catch (e) { setMsg(e.message); }
    finally { setLoading(false); }
  }

  return <div className="auth-wrap">
    <div className="auth-card">
      <div className="brand"><ShieldCheck size={30}/><span>FraudLens <b>AI</b></span></div>
      <p className="muted">AI-based fake identity & document screening</p>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMsg(""); }}><LogIn size={16}/> Login</button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMsg(""); }}><UserPlus size={16}/> Sign up</button>
      </div>
      <div className="auth-mode" aria-live="polite">{mode === "signup" ? "Create your FraudLens AI account" : "Sign in to FraudLens AI"}</div>
      <form onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required /></label>
        {msg && <div className="notice">{msg}</div>}
        <button className="primary full" disabled={loading}>{loading ? "Please wait..." : mode==="login" ? "Login" : "Create account"}</button>
      </form>
    </div>
  </div>
}

function Result({data}) {
  if (!data) return null;
  const r = data.result;
  return <section className="result-grid">
    <div className="result-card decision-card">
      <div className="eyebrow">DECISION</div>
      <div className="decision">{data.decision}</div>
      <div className="score-label">Risk score</div><Score value={data.risk_score}/>
    </div>
    <div className="result-card">
      <div className="eyebrow">WHY</div>
      <ul>{r.reasons.map((x,i)=><li key={i}>{x}</li>)}</ul>
    </div>
    <div className="result-card wide">
      <div className="eyebrow">VERIFICATION LAYERS</div>
      <div className="layer-grid">
        <Layer title="OCR" icon={<ScanLine/>} data={r.layers.ocr}/>
        <Layer title="Visual Forensics" icon={<Eye/>} data={r.layers.visual_forensics}/>
        <Layer title="Face" icon={<ShieldCheck/>} data={r.layers.face_detection}/>
        <Layer title="Data / Pattern" icon={<Database/>} data={r.layers.data_checks}/>
      </div>
    </div>
  </section>
}

function Layer({title, icon, data}) {
  return <div className="layer">
    <div className="layer-title">{icon}<b>{title}</b></div>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
}

function Screening() {
  const [type, setType] = useState("aadhaar");
  const [file, setFile] = useState(null);
  const [face, setFace] = useState(null);
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault(); if (!file) return setError("Select a document image first.");
    setLoading(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("document_type", type);
    fd.append("expected_name", name);
    fd.append("expected_id", id);
    fd.append("document", file);
    if (face) fd.append("reference_face", face);
    try { setResult(await analyzeDocument(fd)); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return <main>
    <div className="page-head"><div><div className="eyebrow">MULTI-LAYER VERIFICATION</div><h1>Screen a document</h1><p>Visual + data + pattern forensic checks in one pipeline.</p></div></div>
    <form className="panel form-grid" onSubmit={submit}>
      <label>Document type<select value={type} onChange={e=>setType(e.target.value)}><option value="aadhaar">Aadhaar</option><option value="pan">PAN</option><option value="dl">Driving Licence</option><option value="passport">Passport</option></select></label>
      <label>Expected name (optional)<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Rahul Kumar"/></label>
      <label>Expected ID (optional)<input value={id} onChange={e=>setId(e.target.value)} placeholder="Cross-check extracted ID"/></label>
      <label>Document image<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0])}/></label>
      <label>Reference face (optional)<input type="file" accept="image/*" onChange={e=>setFace(e.target.files?.[0])}/></label>
      <div className="form-action"><button className="primary" disabled={loading}><Upload size={18}/>{loading?"Analyzing...":"Analyze document"}</button></div>
      {error && <div className="error">{error}</div>}
    </form>
    <Result data={result}/>
  </main>
}

function LiveCamera() {
  const video = useRef(null), canvas = useRef(null);
  const streamRef = useRef(null), timer = useRef(null), busy = useRef(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [running, setRunning] = useState(false), [result, setResult] = useState(null), [error,setError]=useState("");

  function stop() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (video.current) video.current.srcObject = null;
    busy.current = false;
    setRunning(false);
  }

  async function captureAndMatch() {
    const v = video.current, c = canvas.current;
    if (!documentFile) return;
    if (!v || !c || !v.videoWidth || busy.current) return;
    busy.current = true;
    try {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Camera frame is not available.");
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const blob = await new Promise(resolve => c.toBlob(resolve, "image/jpeg", .84));
      if (!blob) throw new Error("Could not capture a camera frame.");
      const data = await matchLiveFace(documentFile, blob);
      setResult(data);
      setError("");
    } catch (e) {
      setError(e.message || "Face matching failed. The camera will continue running.");
    } finally {
      busy.current = false;
    }
  }

  async function start() {
    setError("");
    if (!documentFile) {
      setError("Upload the identity document first. The live photo will be matched against its face.");
      return;
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setError("Camera access requires HTTPS or localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not provide camera access. Open the app in Chrome or Edge on localhost.");
      return;
    }
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (!video.current) throw new Error("Camera preview is not ready. Please try again.");
      video.current.srcObject = stream;
      await video.current.play();
      setRunning(true);
      setTimeout(captureAndMatch, 800);
      timer.current = setInterval(captureAndMatch, 3000);
    } catch(e) {
      stop();
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") setError("Camera permission was denied. Allow camera access for localhost and try again.");
      else if (name === "NotFoundError") setError("No camera was found on this device.");
      else if (name === "NotReadableError") setError("The camera is being used by another app. Close WhatsApp/Camera and try again.");
      else setError(e.message || "Camera permission was denied or unavailable.");
    }
  }

  useEffect(() => () => stop(), []);

  const score = result?.match_score ?? null;
  return <main>
    <div className="page-head"><div><div className="eyebrow">LIVE FACE MATCH</div><h1>Match live camera with document</h1><p>Upload the identity document, then the live camera photo is compared with the document portrait.</p></div></div>
    <div className="panel form-grid live-match-form">
      <label>Identity document<input type="file" accept="image/*" onChange={e=>{ setDocumentFile(e.target.files?.[0] || null); setResult(null); setError(""); }}/></label>
      <div className="form-action"><Pill tone={documentFile ? "good" : ""}>{documentFile ? `Document ready: ${documentFile.name}` : "Upload document first"}</Pill></div>
    </div>
    <div className="camera-layout">
      <div className="panel camera"><video ref={video} muted playsInline autoPlay/><canvas ref={canvas} hidden/><div className="camera-actions">{!running?<button type="button" className="primary" onClick={start}><Camera/>Start live match</button>:<button type="button" className="danger" onClick={stop}>Stop camera</button>}</div></div>
      <div className="panel live-result">
        {result ? <>
          <div className="eyebrow">LIVE DOCUMENT MATCH</div>
          <div className="decision">{result.decision}</div>
          <div className="score-label">Face match score</div><Score value={score}/>
          <ul><li>{result.reason}</li><li>Document face detected: {result.document_face ? "Yes" : "No"}</li></ul>
          <small>{result.warning}</small>
        </> : <><Activity size={40}/><p>{documentFile ? "Start the camera to compare your live face with the document portrait." : "Upload a document first."}</p></>}
        {error&&<div className="error">{error}</div>}
      </div>
    </div>
  </main>
}
function Dashboard() {
  const [page,setPage]=useState("screen");
  const [healthState,setHealthState]=useState(null);
  useEffect(()=>{health().then(setHealthState).catch(()=>{});},[]);
  return <div className="app">
    <aside>
      <div className="brand"><ShieldCheck/><span>FraudLens <b>AI</b></span></div>
      <button className={page==="screen"?"nav active":"nav"} onClick={()=>setPage("screen")}><ScanLine/>Screening</button>
      <button className={page==="live"?"nav active":"nav"} onClick={()=>setPage("live")}><Camera/>Live Camera</button>
      <div className="side-bottom"><Pill tone={healthState?.ocr_available?"good":""}>{healthState?.ocr_available?"OCR online":"OCR needs Tesseract"}</Pill><small>SIH 2026 • PS 26188 • Live Camera v2</small></div>
    </aside>
    <div className="content">{page==="screen"?<Screening/>:<LiveCamera/>}</div>
  </div>
}

export default function App() {
  const [user,setUser]=useState(null);
  return user ? <Dashboard/> : <Auth onAuth={setUser}/>;
}
