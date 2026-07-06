'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { pingAgent, savePrompt, openFolder } from './lib/agent';

type WorkMode = 'shot' | 'video' | 'asset' | 'design';
type Screen = 'create' | 'search' | 'assets' | 'shots' | 'settings';

const PROJECTS = [
  { code: 'AN2601', name: '첫번째 애니메이션' },
  { code: 'CM2601', name: '○○브랜드 광고' },
  { code: 'MV2512', name: '뮤직비디오' },
];

const WORK_TYPES = [
  { type: 'DES', mode: 'design' as WorkMode, icon: 'ti-bulb', label: '디자인\n이미지' },
  { type: 'CHR', mode: 'asset' as WorkMode, icon: 'ti-user', label: '캐릭터\n시트' },
  { type: 'PROP', mode: 'asset' as WorkMode, icon: 'ti-box', label: '프랍\n시트' },
  { type: 'BG', mode: 'asset' as WorkMode, icon: 'ti-mountain', label: '배경\n시트' },
  { type: 'SHOT', mode: 'shot' as WorkMode, icon: 'ti-photo', label: '컷\n이미지' },
  { type: 'VDO', mode: 'video' as WorkMode, icon: 'ti-movie', label: '컷\n영상' },
];

const TOOLS = [
  { name: 'ChatGPT', type: '이미지' },
  { name: 'Claude', type: '이미지' },
  { name: 'Kling', type: '영상' },
  { name: 'Seedance', type: '영상' },
];

const ZONES = [
  { key: 'scene', label: 'Scene', tip: '대상 + 공간 + 행동', type: 'textarea', options: [] },
  { key: 'composition', label: 'Composition', tip: '샷 + 앵글 + 프레임', type: 'select', options: ['wide shot', 'close up', "bird's eye", 'low angle'] },
  { key: 'light', label: 'Light', tip: '시간 + 방향 + 질감', type: 'select', options: ['golden hour', 'blue hour', 'dramatic low-key', 'soft diffused'] },
  { key: 'camera', label: 'Camera', tip: '렌즈 + 거리 + 무브', type: 'select', options: ['50mm', '85mm', '24mm wide', 'shallow DOF'] },
  { key: 'motion', label: 'Motion', tip: '피사체 + 환경 + 속도', type: 'select', options: ['slow motion', 'camera pan', 'dolly in', 'handheld'], videoOnly: true },
  { key: 'artStyle', label: 'Art Style', tip: '렌더 스타일 + 색감', type: 'select', options: ['cinematic', 'anime', 'realistic', 'painterly'] },
  { key: 'ratio', label: 'Ratio', tip: '출력 해상도 비율', type: 'select', options: ['16:9', '4:3', '1:1', '9:16', '2.39:1'] },
  { key: 'negative', label: 'Negative', tip: '제외할 요소', type: 'select', options: ['blurry', 'watermark', 'text'] },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>('create');
  const [projIdx, setProjIdx] = useState(0);
  const [ddOpen, setDdOpen] = useState(false);
  const [curType, setCurType] = useState('SHOT');
  const [curMode, setCurMode] = useState<WorkMode>('shot');
  const [warnPending, setWarnPending] = useState<{ type: string; mode: WorkMode } | null>(null);
  const [selectedTool, setSelectedTool] = useState('ChatGPT');
  const [ep, setEp] = useState('001');
  const [sc, setSc] = useState('003');
  const [cut, setCut] = useState('005');
  const [ex1, setEx1] = useState('');
  const [ex2, setEx2] = useState('');
  const [aname, setAname] = useState('');
  const [aex1, setAex1] = useState('');
  const [aex2, setAex2] = useState('');
  const [zones, setZones] = useState<Record<string, string>>({});
  const [prevEn, setPrevEn] = useState('');
  const [prevKo, setPrevKo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [toolStep, setToolStep] = useState<'pick' | 'key'>('pick');
  const [pendToolName, setPendToolName] = useState('');
  const [customToolName, setCustomToolName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [extraTools, setExtraTools] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ ChatGPT: '', Claude: '', Kling: '' });
  const [agentConnected, setAgentConnected] = useState(false);
  const [rootPath, setRootPath] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const check = async () => setAgentConnected(await pingAgent());
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('handyandy_root');
    if (saved) setRootPath(saved);
  }, []);

  const proj = PROJECTS[projIdx];

  const buildName = () => {
    if (curMode === 'shot' || curMode === 'video') {
      const e = ep.padStart(3, '0'), s = sc.padStart(3, '0'), c = cut.padStart(3, '0');
      return `${proj.code}_${curType}_EP${e}_SC${s}_CUT${c}${ex1 ? '_' + ex1 : ''}${ex2 ? '_' + ex2 : ''}_V001`;
    } else {
      const n = aname || 'Name';
      return `${proj.code}_${curType}_${n}${aex1 ? '_' + aex1 : ''}${aex2 ? '_' + aex2 : ''}_V001`;
    }
  };

  const buildPath = () => {
    if (curMode === 'shot' || curMode === 'video') {
      const e = ep.padStart(3, '0'), s = sc.padStart(3, '0'), c = cut.padStart(3, '0');
      return `prompts/EP${e}/SC${s}/CUT${c}/`;
    }
    const fd = curType === 'CHR' ? 'characters' : curType === 'PROP' ? 'props' : curType === 'BG' ? 'backgrounds' : 'design';
    return `_assets/prompts/${fd}/`;
  };

  const hasInput = () => Object.values(zones).some(v => v.trim());

  const reqType = (type: string, mode: WorkMode) => {
    if (curType === type) return;
    if (hasInput()) { setWarnPending({ type, mode }); return; }
    applyType(type, mode);
  };

  const applyType = (type: string, mode: WorkMode) => {
    setCurType(type); setCurMode(mode); setZones({}); setPrevEn(''); setPrevKo('');
    setWarnPending(null);
  };

  const setZone = (key: string, val: string) => setZones(z => ({ ...z, [key]: val }));

  const handleSave = async () => {
    if (!rootPath) { setSaveMsg('설정에서 저장 경로를 먼저 지정해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    if (!prevEn) { setSaveMsg('프롬프트를 먼저 생성해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    const name = buildName();
    const relPath = buildPath();
    const filePath = `${rootPath}/${proj.code}/${relPath}${name}.json`;
    const data = {
      filename: name, project: proj.code, type: curType, tool: selectedTool,
      ep: ep.padStart(3,'0'), sc: sc.padStart(3,'0'), cut: cut.padStart(3,'0'),
      extra1: ex1, extra2: ex2, version: '001',
      zones, prompt_en: prevEn, prompt_ko: prevKo,
      created_at: new Date().toISOString().split('T')[0],
    };
    const result = await savePrompt(filePath, data);
    setSaveMsg(result.ok ? '저장 완료!' : `저장 실패: ${result.error}`);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleOpenFolder = async () => {
    if (!rootPath) { setSaveMsg('설정에서 저장 경로를 먼저 지정해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    const relPath = buildPath();
    const folder = `${rootPath}/${proj.code}/${relPath}`;
    await openFolder(folder);
  };

  const screenTitle: Record<Screen, string> = {
    create: '새 프롬프트 생성', search: '프롬프트 검색',
    assets: '어셋 관리', shots: '샷 목록', settings: '설정',
  };

  const navItems: { id: Screen; icon: string; label: string }[] = [
    { id: 'create', icon: 'ti-pencil', label: '프롬프트 생성' },
    { id: 'search', icon: 'ti-search', label: '프롬프트 검색' },
    { id: 'assets', icon: 'ti-users', label: '어셋 관리' },
    { id: 'shots', icon: 'ti-layout-list', label: '샷 목록' },
    { id: 'settings', icon: 'ti-settings', label: '설정' },
  ];

  return (
    <div className={styles.app} onClick={() => setDdOpen(false)}>

      {/* 경고 모달 */}
      {warnPending && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>작업 유형 변경</div>
            <div className={styles.modalMsg}>입력된 내용이 모두 초기화됩니다.<br />계속할까요?</div>
            <div className={styles.modalBtns}>
              <button className={styles.btn} onClick={() => setWarnPending(null)}>취소</button>
              <button className={`${styles.btn} ${styles.btnP}`} onClick={() => applyType(warnPending.type, warnPending.mode)}>확인</button>
            </div>
          </div>
        </div>
      )}

      {/* 툴 추가 모달 */}
      {addToolOpen && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>AI 툴 추가</div>
            {toolStep === 'pick' ? (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>지원 툴 선택</div>
                {['Midjourney', 'Runway', 'Pika'].map(t => (
                  <div key={t} className={styles.toolOption} onClick={() => { setPendToolName(t); setToolStep('key'); }}>
                    {t}
                  </div>
                ))}
                <div className={styles.toolOption} onClick={() => { setPendToolName('custom'); setToolStep('key'); }}>직접 입력</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
                  {pendToolName === 'custom' ? '툴 이름 + API 키 입력' : `${pendToolName} API 키 입력`}
                </div>
                {pendToolName === 'custom' && (
                  <input className={styles.modalInput} placeholder="툴 이름" value={customToolName} onChange={e => setCustomToolName(e.target.value)} />
                )}
                <input className={styles.modalInput} type="password" placeholder="API Key" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} />
              </div>
            )}
            <div className={styles.modalBtns}>
              <button className={styles.btn} onClick={() => { setAddToolOpen(false); setToolStep('pick'); }}>취소</button>
              {toolStep === 'key' && (
                <button className={`${styles.btn} ${styles.btnP}`} onClick={() => {
                  const name = pendToolName === 'custom' ? customToolName || '새 툴' : pendToolName;
                  setExtraTools(t => [...t, name]);
                  setApiKeys(k => ({ ...k, [name]: newApiKey }));
                  setAddToolOpen(false); setToolStep('pick'); setNewApiKey(''); setCustomToolName('');
                }}>추가</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <div className={styles.sidebar}>
        <div className={styles.sbTop}>
          <div className={styles.logo}>HandyAndy</div>
          <div className={styles.projBox} onClick={e => { e.stopPropagation(); setDdOpen(o => !o); }}>
            <div className={styles.projLeft}>
              <i className="ti ti-video" style={{ fontSize: 13, color: 'var(--color-text-info)' }} />
              <div>
                <div className={styles.pcode}>{proj.code}</div>
                <div className={styles.pname}>{proj.name}</div>
              </div>
            </div>
            <i className="ti ti-chevron-down" style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }} />
            {ddOpen && (
              <div className={styles.projDd} onClick={e => e.stopPropagation()}>
                {PROJECTS.map((p, i) => (
                  <div key={p.code} className={`${styles.ddItem} ${i === projIdx ? styles.ddItemCur : ''}`}
                    onClick={() => { setProjIdx(i); setDdOpen(false); }}>
                    {p.name}<small>{p.code}</small>
                  </div>
                ))}
                <div className={styles.ddDiv} />
                <div className={`${styles.ddItem} ${styles.ddNew}`} onClick={() => setDdOpen(false)}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} />새 프로젝트
                </div>
              </div>
            )}
          </div>
          <div className={styles.changeBtn} onClick={e => { e.stopPropagation(); setDdOpen(o => !o); }}>프로젝트 변경</div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSec}>작업</div>
          {navItems.slice(0, 2).map(item => (
            <div key={item.id} className={`${styles.navItem} ${screen === item.id ? styles.navItemActive : ''}`}
              onClick={() => setScreen(item.id)}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </div>
          ))}
          <div className={styles.navSec}>프로젝트</div>
          {navItems.slice(2).map(item => (
            <div key={item.id} className={`${styles.navItem} ${screen === item.id ? styles.navItemActive : ''}`}
              onClick={() => setScreen(item.id)}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className={styles.sbBottom}>
          <div className={styles.connStatus} style={{ color: agentConnected ? 'var(--color-text-success)' : 'var(--color-text-danger)' }}>
            <span className={styles.connDot} style={{ background: agentConnected ? 'var(--color-text-success)' : 'var(--color-text-danger)' }} />
            <span>{agentConnected ? '연결됨' : '연결 끊김'}</span>
          </div>
          <button className={styles.updateBtn}>
            <i className="ti ti-refresh" style={{ fontSize: 11 }} />업데이트 확인
          </button>
        </div>
      </div>

      {/* 메인 */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarTitle}>{screenTitle[screen]}</div>
          {screen === 'create' && (
            <div className={styles.namePrev}>{buildName()}</div>
          )}
        </div>

        {/* 프롬프트 생성 */}
        {screen === 'create' && (
          <div className={styles.screen}>
            <div>
              <div className={styles.stepRow}><div className={styles.stepNum}>1</div><div className={styles.stepLbl}>작업 유형</div></div>
              <div className={styles.tgrid}>
                {WORK_TYPES.map(w => (
                  <div key={w.type} className={`${styles.tc} ${curType === w.type ? styles.tcSel : ''}`}
                    onClick={() => reqType(w.type, w.mode)}>
                    <i className={`ti ${w.icon}`} style={{ fontSize: 13, display: 'block', marginBottom: 2 }} />
                    <span style={{ fontSize: 9, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{w.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.stepRow}><div className={styles.stepNum}>2</div><div className={styles.stepLbl}>{(curMode === 'shot' || curMode === 'video') ? '샷 정보 + 생성 툴' : '어셋 정보 + 생성 툴'}</div></div>
              {(curMode === 'shot' || curMode === 'video') ? (
                <div className={styles.frow}>
                  {[{ lbl: 'EP', pfx: 'EP', val: ep, set: setEp }, { lbl: 'SC', pfx: 'SC', val: sc, set: setSc }, { lbl: 'CUT', pfx: 'CUT', val: cut, set: setCut }].map(f => (
                    <div key={f.lbl} className={styles.fl}>
                      <label>{f.lbl}</label>
                      <div className={styles.ffixed}>
                        <span className={styles.pfx}>{f.pfx}</span>
                        <input type="text" value={f.val} maxLength={5} onChange={e => f.set(e.target.value)} style={{ width: 38 }} />
                      </div>
                    </div>
                  ))}
                  <div className={styles.fl}><label>Extra 1</label><input type="text" value={ex1} placeholder="최대 15자" onChange={e => setEx1(e.target.value)} style={{ width: 90 }} /></div>
                  <div className={styles.fl}><label>Extra 2</label><input type="text" value={ex2} placeholder="최대 15자" onChange={e => setEx2(e.target.value)} style={{ width: 90 }} /></div>
                </div>
              ) : (
                <div className={styles.frow}>
                  <div className={styles.fl} style={{ flex: 1 }}><label>어셋 이름</label><input type="text" value={aname} placeholder="예: Hero" onChange={e => setAname(e.target.value)} style={{ width: '100%' }} /></div>
                  <div className={styles.fl}><label>Extra 1</label><input type="text" value={aex1} placeholder="최대 15자" onChange={e => setAex1(e.target.value)} style={{ width: 90 }} /></div>
                  <div className={styles.fl}><label>Extra 2</label><input type="text" value={aex2} placeholder="최대 15자" onChange={e => setAex2(e.target.value)} style={{ width: 90 }} /></div>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>생성 툴</div>
                <div className={styles.trow}>
                  {TOOLS.map(t => (
                    <div key={t.name} className={`${styles.tool} ${selectedTool === t.name ? styles.toolSel : ''}`} onClick={() => setSelectedTool(t.name)}>
                      <div className={styles.tn}>{t.name}</div>
                      <div className={styles.tt}>{t.type}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.pathBar}>
                <i className="ti ti-folder" style={{ fontSize: 12 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{buildPath()}<strong style={{ color: 'var(--color-text-info)' }}>{buildName()}.json</strong></span>
                <button className={styles.btnSm} onClick={handleOpenFolder}><i className="ti ti-folder-open" style={{ fontSize: 11 }} />폴더 열기</button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.stepRow}><div className={styles.stepNum}>3</div><div className={styles.stepLbl}>프롬프트</div></div>
              <div className={styles.pzones}>
                {ZONES.filter(z => !z.videoOnly || curMode === 'video').map(z => (
                  <div key={z.key} className={styles.zrow}>
                    <div className={styles.zlbl}>
                      {z.label}
                      <i className="ti ti-info-circle" style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }} />
                      <div className={styles.ztip}>{z.tip}</div>
                    </div>
                    {z.type === 'textarea' ? (
                      <textarea className={styles.zta} rows={2} placeholder="장면을 직접 입력..." value={zones[z.key] || ''} onChange={e => setZone(z.key, e.target.value)} />
                    ) : (
                      <>
                        <select className={styles.zsel} value={zones[z.key] || ''} onChange={e => setZone(z.key, e.target.value)}>
                          <option value="">선택...</option>
                          {z.options.map(o => <option key={o}>{o}</option>)}
                        </select>
                        <input className={styles.zinp} type="text" placeholder="직접 입력" value={zones[z.key] || ''} onChange={e => setZone(z.key, e.target.value)} />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className={styles.previewRow}>
                <div className={styles.prevBox}>
                  <div className={styles.prevLabel}>English</div>
                  <div className={styles.prevText} style={{ fontStyle: prevEn ? 'normal' : 'italic', color: prevEn ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                    {prevEn || '프롬프트 생성 후 표시됩니다'}
                  </div>
                </div>
                <div className={styles.prevBox}>
                  <div className={styles.prevLabel}>한국어</div>
                  <div className={styles.prevText} style={{ fontStyle: prevKo ? 'normal' : 'italic', color: prevKo ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                    {prevKo || '프롬프트 생성 후 표시됩니다'}
                  </div>
                </div>
              </div>
              <div className={styles.arow}>
                <button className={styles.btn} onClick={() => { setPrevEn('A young male hero standing at the edge of a dark forest at dusk, holding a sword. Dramatic low-key lighting, wide shot, cinematic, 16:9.'); setPrevKo('황혼 무렵 어두운 숲 입구에 서 있는 젊은 남성 영웅, 검을 들고 있음. 극적인 로우키 조명, 와이드샷, 시네마틱, 16:9.'); }}>
                  <i className="ti ti-sparkles" />프롬프트 생성
                </button>
                <button className={`${styles.btn} ${styles.btnP}`} onClick={handleSave}><i className="ti ti-send" />저장 후 전송</button>
              </div>
              {saveMsg && <div style={{ fontSize: 11, color: saveMsg.includes('완료') ? 'var(--color-text-success)' : 'var(--color-text-danger)', marginTop: 4 }}>{saveMsg}</div>}
            </div>
          </div>
        )}

        {/* 프롬프트 검색 */}
        {screen === 'search' && (
          <div className={styles.screen}>
            <div className={styles.searchTop}>
              <select className={styles.scopeSel}>
                <option value="current">{proj.code}</option>
                <option value="all">ALL</option>
                {PROJECTS.filter((_, i) => i !== projIdx).map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
              </select>
              <div className={styles.sbar}>
                <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <input type="text" placeholder="프롬프트, 파일명 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setSearched(true)}
                  style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--color-text-primary)', width: '100%', outline: 'none' }} />
              </div>
              <button className={styles.btn} onClick={() => setSearched(true)}>검색</button>
              <button className={styles.btn} style={{ padding: '5px 7px' }} onClick={() => { setSearchQuery(''); setSearched(false); }}>
                <i className="ti ti-x" />
              </button>
            </div>
            {searched && (
              <div className={styles.filters}>
                {['전체', '컷 이미지', '컷 영상', '캐릭터 시트', 'EP001', 'SC003'].map((f, i) => (
                  <button key={f} className={`${styles.fbtn} ${i === 0 ? styles.fbtnOn : ''}`}>{f}</button>
                ))}
              </div>
            )}
            {!searched ? (
              <div className={styles.searchEmpty}>
                <i className="ti ti-search" style={{ fontSize: 28, color: 'var(--color-text-tertiary)' }} />
                <p>검색어를 입력하세요</p>
                <small>프롬프트 내용, 파일명, 어셋명으로 검색 가능</small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { id: 'AN2601_SHOT_EP001_SC003_CUT005_V001', badge: '컷 이미지', badgeClass: styles.bShot, tool: 'ChatGPT', prompt: 'A young male hero standing at the edge of a dark forest at dusk, holding a sword.', date: '2026.07.01', icon: 'ti-photo' },
                  { id: 'AN2601_BG_Forest_day_V001', badge: '배경 시트', badgeClass: styles.bBg, tool: 'Claude', prompt: 'A dense ancient forest environment, tall oak trees, soft dappled sunlight, mist near the ground.', date: '2026.06.28', icon: 'ti-mountain' },
                ].map(r => (
                  <div key={r.id} className={styles.rcard}>
                    <div className={styles.rtop}>
                      <div className={styles.rid}>{r.id}</div>
                      <div className={styles.rmeta}>
                        <span className={`${styles.badge} ${r.badgeClass}`}>{r.badge}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{r.tool}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'flex-start' }}>
                      <div className={styles.rthumb}><i className={`ti ${r.icon}`} style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }} /></div>
                      <div className={styles.rprompt}>{r.prompt}</div>
                    </div>
                    <div className={styles.rfoot}>
                      <div className={styles.rstat}><i className="ti ti-clock" style={{ fontSize: 11 }} />{r.date}</div>
                      <div className={styles.rstat}><i className="ti ti-versions" style={{ fontSize: 11 }} />V001</div>
                      <div className={styles.ract}>
                        <button className={styles.btnSm}><i className="ti ti-photo" style={{ fontSize: 10 }} />이미지 열기</button>
                        <button className={styles.btnSm}><i className="ti ti-folder-open" style={{ fontSize: 10 }} />경로 열기</button>
                        <button className={styles.btnSm}><i className="ti ti-edit" style={{ fontSize: 10 }} />수정</button>
                        <button className={styles.btnSm}><i className="ti ti-send" style={{ fontSize: 10 }} />재전송</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 어셋 관리 */}
        {screen === 'assets' && (
          <div className={styles.screen}>
            {[
              { icon: 'ti-user', label: '캐릭터 (CHR)', items: [{ name: 'Hero', vers: ['V001', 'V002'] }, { name: 'Villain', vers: ['V001'] }] },
              { icon: 'ti-box', label: '프랍 (PROP)', items: [{ name: 'Sword', vers: ['V001'] }] },
              { icon: 'ti-mountain', label: '배경 (BG)', items: [{ name: 'Forest_day', vers: ['V001', 'V002'] }] },
            ].map(g => (
              <div key={g.label} className={styles.assetGroup}>
                <div className={styles.assetGroupHd}><i className={`ti ${g.icon}`} />{g.label}</div>
                {g.items.map(item => (
                  <div key={item.name} className={styles.assetRow}>
                    <div className={styles.assetName}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className={styles.verTags}>{item.vers.map(v => <span key={v} className={styles.verTag}>{v}</span>)}</div>
                      <button className={styles.btnSm}><i className="ti ti-folder-open" style={{ fontSize: 10 }} />폴더</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 샷 목록 */}
        {screen === 'shots' && (
          <div className={styles.screen}>
            {[
              { ep: 'EP001', scenes: [{ sc: 'SC001', cuts: [{ n: 'CUT001', has: true }, { n: 'CUT002', has: true }, { n: 'CUT003', has: false }] }, { sc: 'SC003', cuts: [{ n: 'CUT001', has: true }, { n: 'CUT002', has: true }, { n: 'CUT003', has: true }, { n: 'CUT004', has: true }, { n: 'CUT005', has: true }, { n: 'CUT006', has: false }] }] },
              { ep: 'EP002', scenes: [{ sc: 'SC001', cuts: [{ n: 'CUT001', has: true }, { n: 'CUT002', has: false }, { n: 'CUT003', has: false }] }] },
            ].map(ep => (
              <div key={ep.ep} className={styles.epBlock}>
                <div className={styles.epHd}><i className="ti ti-chevron-down" style={{ fontSize: 11 }} />{ep.ep}</div>
                {ep.scenes.map(sc => (
                  <div key={sc.sc} className={styles.scBlock}>
                    <div className={styles.scHd}><i className="ti ti-minus" style={{ fontSize: 10 }} />{sc.sc}</div>
                    <div className={styles.cutRow}>
                      {sc.cuts.map(c => (
                        <span key={c.n} className={`${styles.cutTag} ${c.has ? styles.cutTagHas : styles.cutTagNo}`}>{c.n}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                <span style={{ width: 12, height: 12, background: 'var(--color-background-info)', borderRadius: 3, display: 'inline-block' }} />프롬프트 있음
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                <span style={{ width: 12, height: 12, border: '1px dashed var(--color-border-secondary)', borderRadius: 3, display: 'inline-block' }} />미생성
              </div>
            </div>
          </div>
        )}

        {/* 설정 */}
        {screen === 'settings' && (
          <div className={styles.screen}>
            <div className={styles.settingGroup}>
              <div className={styles.settingHd}>
                AI 툴 API 키
                <button className={styles.btnSm} onClick={() => { setAddToolOpen(true); setToolStep('pick'); }}>
                  <i className="ti ti-plus" style={{ fontSize: 10 }} />툴 추가
                </button>
              </div>
              {['ChatGPT', 'Claude', 'Kling'].concat(extraTools).map(t => (
                <div key={t} className={styles.apiRow}>
                  <div className={styles.apiName}>{t}</div>
                  <input className={styles.apiInput} type="password" placeholder="API Key" value={apiKeys[t] || ''} onChange={e => setApiKeys(k => ({ ...k, [t]: e.target.value }))} />
                  <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => setExtraTools(et => et.filter(x => x !== t))}>
                    <i className="ti ti-trash" style={{ fontSize: 10 }} />
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingHd}>기본 설정</div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>기본 저장 경로</div>
                  <div className={styles.settingSub}>{rootPath || '경로가 설정되지 않았습니다.'}</div>
                </div>
                <input type="text" placeholder="/Users/dogoon/Desktop" value={rootPath}
                  onChange={e => { setRootPath(e.target.value); localStorage.setItem('handyandy_root', e.target.value); }}
                  style={{ fontSize: 11, padding: '4px 7px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: 180 }} />
              </div>
              <div className={styles.settingRow}>
                <div><div className={styles.settingLabel}>프리셋 관리</div><div className={styles.settingSub}>드롭다운 항목 편집</div></div>
                <button className={styles.btn}><i className="ti ti-edit" style={{ fontSize: 11 }} />편집</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
