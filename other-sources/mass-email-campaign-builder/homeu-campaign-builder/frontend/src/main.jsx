import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './lib/api.js';
import './style.css';

function App() {
  const [tab, setTab] = useState('campaigns');
  return <div className="shell">
    <aside>
      <h2>DaVinciOS Marketing</h2>
      {['campaigns','templates','contacts','segments'].map(t => <button className={tab===t?'active':''} onClick={()=>setTab(t)} key={t}>{t}</button>)}
    </aside>
    <main>
      {tab==='campaigns' && <Campaigns/>}
      {tab==='templates' && <Templates/>}
      {tab==='contacts' && <Contacts/>}
      {tab==='segments' && <Segments/>}
    </main>
  </div>
}

function Campaigns() {
  const [items, setItems] = useState([]); const [templates, setTemplates] = useState([]); const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({ name:'New Product Feature', subject:'New HomeU pieces for {{firstName}}', template_id:'', segment_id:'' });
  async function load(){ setItems(await api('/api/campaigns')); setTemplates(await api('/api/templates')); setSegments(await api('/api/segments')); }
  useEffect(()=>{load()},[]);
  async function create(){ await api('/api/campaigns',{method:'POST',body:JSON.stringify(form)}); await load(); }
  async function prepare(id){ alert(JSON.stringify(await api(`/api/campaigns/${id}/prepare`,{method:'POST'}))); await load(); }
  async function send(id){ if(confirm('Send this campaign to queued recipients?')) alert(JSON.stringify(await api(`/api/campaigns/${id}/send`,{method:'POST'}))); await load(); }
  return <section><h1>Campaign Builder</h1><div className="card grid"><input placeholder="Campaign name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="Subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/><select onChange={e=>setForm({...form,template_id:e.target.value})}><option>Template</option>{templates.map(t=><option value={t.id}>{t.name}</option>)}</select><select onChange={e=>setForm({...form,segment_id:e.target.value})}><option>Segment</option>{segments.map(s=><option value={s.id}>{s.name}</option>)}</select><button onClick={create}>Create Campaign</button></div>{items.map(c=><div className="card" key={c.id}><h3>{c.name}</h3><p>{c.subject}</p><p>Status: <b>{c.status}</b> · Segment: {c.segment_name} · Recipients: {c.recipients} · Sent: {c.sent}</p><button onClick={()=>prepare(c.id)}>Prepare Recipients</button><button onClick={()=>send(c.id)}>Send</button><Analytics id={c.id}/></div>)}</section>
}
function Analytics({id}){ const [a,setA]=useState(null); return <div><button onClick={async()=>setA(await api(`/api/campaigns/${id}/analytics`))}>Load Analytics</button>{a&&<pre>{JSON.stringify(a,null,2)}</pre>}</div> }

function Templates(){
 const [items,setItems]=useState([]); const [form,setForm]=useState({name:'HomeU Simple Template',subject:'New furniture ideas for {{firstName}}',html_body:'<h1>Hello {{firstName}}</h1><p>See our latest HomeU products.</p><p><a href="https://homeu.ph/collections/new-arrivals">View products</a></p><p><a href="{{contactCardUrl}}">Add HomeU to contacts</a></p><p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>',text_body:'Hello {{firstName}}, see our latest products: https://homeu.ph'});
 async function load(){setItems(await api('/api/templates'))} useEffect(()=>{load()},[]); async function create(){await api('/api/templates',{method:'POST',body:JSON.stringify(form)}); await load();}
 return <section><h1>Email Templates</h1><div className="card"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/><textarea rows="10" value={form.html_body} onChange={e=>setForm({...form,html_body:e.target.value})}/><button onClick={create}>Save Template</button></div>{items.map(t=><div className="card"><h3>{t.name}</h3><p>{t.subject}</p></div>)}</section>
}
function Contacts(){ const [items,setItems]=useState([]); const [form,setForm]=useState({email:'',first_name:'',role:'architect',marketing_consent:true}); async function load(){setItems(await api('/api/contacts'))} useEffect(()=>{load()},[]); async function create(){await api('/api/contacts',{method:'POST',body:JSON.stringify(form)}); await load();} return <section><h1>Contacts</h1><div className="card grid"><input placeholder="Email" onChange={e=>setForm({...form,email:e.target.value})}/><input placeholder="First name" onChange={e=>setForm({...form,first_name:e.target.value})}/><select onChange={e=>setForm({...form,role:e.target.value})}><option>architect</option><option>designer</option><option>contractor</option><option>homeowner</option></select><button onClick={create}>Add Contact</button></div><table><tbody>{items.map(c=><tr><td>{c.email}</td><td>{c.first_name}</td><td>{c.role}</td><td>{c.marketing_consent?'opted in':'no consent'}</td></tr>)}</tbody></table></section> }
function Segments(){ const [items,setItems]=useState([]); useEffect(()=>{api('/api/segments').then(setItems)},[]); return <section><h1>Segments</h1>{items.map(s=><div className="card"><h3>{s.name}</h3><pre>{JSON.stringify(s.rule,null,2)}</pre></div>)}</section> }

createRoot(document.getElementById('root')).render(<App/>);
