'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { pingAgent, savePrompt, checkFile, nextVersion, pickFolder, pickFile, openFolder, openFile, searchPrompts, scanAssets, scanShots, generatePrompt, generateImage, saveSettings, loadSettings, fetchModels, getImage, createProject, savePreset } from './lib/agent';

type WorkMode = 'shot' | 'video' | 'asset' | 'design';
type Screen = 'create' | 'search' | 'assets' | 'shots' | 'settings';
type ProjStructure = { ep: boolean; sc: boolean; cut: boolean };

const DEFAULT_STRUCTURE: ProjStructure = { ep: true, sc: true, cut: true };

type Project = { code: string; name: string; root: string; structure: ProjStructure };

const DEFAULT_PROJECTS: Project[] = [
  { code: 'AN2601', name: '첫번째 애니메이션', root: '', structure: DEFAULT_STRUCTURE },
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

function Thumbnail({ jsonPath }: { jsonPath: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const imgPath = jsonPath.replace('/prompts/', '/images/').replace('.json', '.png');
    getImage(imgPath).then(r => { if (r.ok && r.data) setSrc(r.data); });
  }, [jsonPath]);
  return (
    <div style={{ width: 64, height: 48, borderRadius: 4, overflow: 'hidden', background: 'var(--color-background-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <i className="ti ti-photo" style={{ fontSize: 16, color: 'var(--color-text-tertiary)' }} />}
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('create');
  const [projIdx, setProjIdx] = useState(0);
  const [ddOpen, setDdOpen] = useState(false);
  const [curType, setCurType] = useState('DES');
  const [curMode, setCurMode] = useState<WorkMode>('design');
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
  const [searchResults, setSearchResults] = useState<{file: string; data: Record<string, unknown>}[]>([]);
  const [searchScope, setSearchScope] = useState('current');
  const [searching, setSearching] = useState(false);
  const [assets, setAssets] = useState<Record<string, {name: string; versions: string[]}[]>>({});
  const [shots, setShots] = useState<Record<string, Record<string, {cut: string; has: boolean}[]>>>({});
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [toolStep, setToolStep] = useState<'pick' | 'key'>('pick');
  const [pendToolName, setPendToolName] = useState('');
  const [customToolName, setCustomToolName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [extraTools, setExtraTools] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ ChatGPT: '', Claude: '', Kling: '' });
  const [agentConnected, setAgentConnected] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [overwritePending, setOverwritePending] = useState<{ filePath: string; data: object } | null>(null);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [projModal, setProjModal] = useState<{ mode: 'create' | 'edit'; editIdx?: number } | null>(null);
  const [modalCode, setModalCode] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalRoot, setModalRoot] = useState('');
  const [modalStruct, setModalStruct] = useState<ProjStructure>(DEFAULT_STRUCTURE);
  const [gptModel, setGptModel] = useState('gpt-4o-mini');
  const [modelList, setModelList] = useState<string[]>(['gpt-4o-mini', 'gpt-4o']);
  const [imageModel, setImageModel] = useState('dall-e-3');
  const [imageModelList, setImageModelList] = useState<string[]>(['dall-e-3', 'dall-e-2']);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    const check = async () => {
      const connected = await pingAgent();
      setAgentConnected(connected);
      if (connected) handleLoadSettings();
    };
    check();
    const interval = setInterval(async () => setAgentConnected(await pingAgent()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLoadSettings = async () => {
    const result = await loadSettings('');
    if (result.ok && result.data) {
      if (result.data.private) {
        const keys = result.data.private as Record<string, string>;
        setApiKeys(k => ({ ...k, ...keys }));
      }
      if (result.data.settings) {
        const s = result.data.settings as Record<string, unknown>;
        if (s.projects) {
          const loaded = (s.projects as Partial<Project>[]).map(p => ({ code: p.code ?? '', name: p.name ?? '', root: (p as Record<string,unknown>).root as string ?? (p as Record<string,unknown>).path as string ?? '', structure: p.structure ?? DEFAULT_STRUCTURE }));
          setProjects(loaded);
          if (s.lastProjCode) {
            const idx = loaded.findIndex(p => p.code === s.lastProjCode);
            if (idx >= 0) setProjIdx(idx);
          }
        }
        if (s.gptModel) setGptModel(s.gptModel as string);
        if (s.modelList) setModelList(s.modelList as string[]);
        if (s.imageModel) setImageModel(s.imageModel as string);
        if (s.imageModelList) setImageModelList(s.imageModelList as string[]);
      }
    }
  };

  const proj: Project = projects[Math.min(projIdx, projects.length - 1)] || { code: '', name: '', root: '', structure: DEFAULT_STRUCTURE };

  const openProjModal = (mode: 'create' | 'edit', editIdx?: number) => {
    if (mode === 'edit' && editIdx !== undefined) {
      const p = projects[editIdx];
      setModalCode(p.code); setModalName(p.name); setModalRoot(p.root); setModalStruct(p.structure);
    } else {
      setModalCode(''); setModalName(''); setModalRoot(''); setModalStruct(DEFAULT_STRUCTURE);
    }
    setProjModal({ mode, editIdx });
  };

  const handleProjModalConfirm = async () => {
    if (!modalCode.trim()) return;
    const entry: Project = { code: modalCode.trim(), name: modalName.trim() || modalCode.trim(), root: modalRoot, structure: modalStruct };
    let updated: Project[];
    if (projModal?.mode === 'edit' && projModal.editIdx !== undefined) {
      updated = projects.map((p, i) => i === projModal.editIdx ? entry : p);
    } else {
      if (modalRoot) {
        const result = await createProject(modalRoot, entry.code);
        if (!result.ok) { setSaveMsg(`폴더 생성 실패: ${result.error}`); setTimeout(() => setSaveMsg(''), 3000); return; }
        entry.root = result.path ?? entry.root;
      }
      updated = [...projects, entry];
    }
    await saveProjects(updated);
    setProjModal(null);
  };

  const loadAssets = async () => {
    if (!proj.root) return;
    const result = await scanAssets(proj.root);
    if (result.ok && result.assets) setAssets(result.assets);
  };

  const loadShots = async () => {
    if (!proj.root) return;
    const result = await scanShots(proj.root);
    if (result.ok && result.shots) setShots(result.shots);
  };

  const struct = proj.structure ?? DEFAULT_STRUCTURE;

  const buildName = () => {
    if (curMode === 'shot' || curMode === 'video') {
      const parts = [proj.code, curType];
      if (struct.ep) parts.push(`EP${ep.padStart(3, '0')}`);
      if (struct.sc) parts.push(`SC${sc.padStart(3, '0')}`);
      if (struct.cut) parts.push(`CUT${cut.padStart(3, '0')}`);
      if (ex1) parts.push(ex1);
      if (ex2) parts.push(ex2);
      parts.push('V001');
      return parts.join('_');
    } else {
      const n = aname || 'Name';
      return `${proj.code}_${curType}_${n}${aex1 ? '_' + aex1 : ''}${aex2 ? '_' + aex2 : ''}_V001`;
    }
  };

  const buildPath = () => {
    if (curMode === 'shot' || curMode === 'video') {
      let path = 'prompts/';
      if (struct.ep) path += `EP${ep.padStart(3, '0')}/`;
      if (struct.sc) path += `SC${sc.padStart(3, '0')}/`;
      if (struct.cut) path += `CUT${cut.padStart(3, '0')}/`;
      return path;
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

  const handleGenerate = async () => {
    const apiKey = apiKeys['ChatGPT'];
    if (!apiKey) { setSaveMsg('설정에서 ChatGPT API 키를 입력해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    if (!hasInput()) { setSaveMsg('프롬프트 영역에 내용을 입력해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    setGenerating(true);
    const result = await generatePrompt(apiKey, zones, curType, gptModel);
    if (result.ok) {
      setPrevEn(result.prompt_en || '');
      setPrevKo(result.prompt_ko || '');
    } else {
      setSaveMsg(`생성 실패: ${result.error}`);
      setTimeout(() => setSaveMsg(''), 3000);
    }
    setGenerating(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearched(true);
    let root = proj.root;
    if (searchScope === 'all') {
      const paths = projects.map(p => p.root).filter(Boolean);
      root = paths[0] ?? '';
    } else if (searchScope !== 'current') {
      root = projects.find(p => p.code === searchScope)?.root ?? '';
    }
    const result = await searchPrompts(root, searchQuery);
    setSearchResults(result.ok && result.results ? result.results as {file: string; data: Record<string, unknown>}[] : []);
    setSearching(false);
  };

  const doSave = async (filePath: string, data: object) => {
    const result = await savePrompt(filePath, data);
    if (!result.ok) { setSaveMsg(`저장 실패: ${result.error}`); setTimeout(() => setSaveMsg(''), 3000); return; }
    setLastSavedPath(filePath);
    setSaveMsg('프롬프트 저장 완료!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleGenerateImage = async () => {
    if (!lastSavedPath) { setSaveMsg('먼저 프롬프트를 저장해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    if (!prevEn) { setSaveMsg('프롬프트가 없습니다.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    const apiKey = apiKeys['ChatGPT'];
    if (!apiKey) { setSaveMsg('ChatGPT API 키가 없습니다.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    setGeneratingImg(true);
    setSaveMsg('이미지 생성 중...');
    const imgPath = lastSavedPath.replace('/prompts/', '/images/').replace(/\.json$/, '.png');
    const imgResult = await generateImage(apiKey, prevEn, imgPath, imageModel);
    setSaveMsg(imgResult.ok ? '이미지 생성 완료!' : `이미지 생성 실패: ${imgResult.error}`);
    setGeneratingImg(false);
    setTimeout(() => setSaveMsg(''), 4000);
  };

  const ensureProjRoot = async (): Promise<string | null> => {
    if (proj.root) return proj.root;
    setSaveMsg('프로젝트 루트 경로가 없습니다. 폴더를 선택해주세요...');
    const picked = await pickFolder();
    if (!picked.ok || !picked.path) { setSaveMsg('취소됨'); setTimeout(() => setSaveMsg(''), 2000); return null; }
    const updated = projects.map((p, i) => i === projIdx ? { ...p, root: picked.path! } : p);
    setProjects(updated);
    await saveSettings('', { projects: updated, gptModel, modelList, imageModel, imageModelList }, false);
    return picked.path!;
  };

  const handleSave = async () => {
    const root = await ensureProjRoot();
    if (!root) return;
    if (!prevEn) { setSaveMsg('프롬프트를 먼저 생성해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
    const name = buildName();
    const relPath = buildPath();
    const filePath = `${root}/${relPath}${name}.json`;
    const data = {
      filename: name, project: proj.code, type: curType, tool: selectedTool,
      ep: ep.padStart(3,'0'), sc: sc.padStart(3,'0'), cut: cut.padStart(3,'0'),
      extra1: ex1, extra2: ex2, version: '001',
      zones, prompt_en: prevEn, prompt_ko: prevKo,
      created_at: new Date().toISOString().split('T')[0],
    };
    const check = await checkFile(filePath);
    if (check.exists) {
      setOverwritePending({ filePath, data });
      return;
    }
    await doSave(filePath, data);
  };

  const saveProjects = async (updated: Project[]) => {
    setProjects(updated);
    await saveSettings('', { projects: updated, gptModel, modelList, imageModel, imageModelList }, false);
  };

  const saveModel = async (model: string, list: string[], imgModel?: string, imgList?: string[]) => {
    const newGpt = model; const newList = list;
    const newImg = imgModel ?? imageModel; const newImgList = imgList ?? imageModelList;
    setGptModel(newGpt); setModelList(newList);
    setImageModel(newImg); setImageModelList(newImgList);
    await saveSettings('', { projects, gptModel: newGpt, modelList: newList, imageModel: newImg, imageModelList: newImgList }, false);
  };

  const handleSavePreset = async () => {
    const root = await ensureProjRoot();
    if (!root) return;
    const name = buildName();
    const filename = `TPL_${name}.json`;
    const data = {
      curType, curMode, selectedTool,
      ep, sc, cut, ex1, ex2, aname, aex1, aex2,
      zones, prompt_en: prevEn, prompt_ko: prevKo,
    };
    const result = await savePreset(root, filename, data);
    setSaveMsg(result.ok ? `프리셋 저장 완료: ${filename}` : `저장 실패: ${result.error}`);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleLoadPreset = async () => {
    const initialDir = proj.root ? `${proj.root}/presets` : '~';
    const result = await pickFile(initialDir);
    if (!result.ok || !result.data) {
      if (result.error !== '취소됨') { setSaveMsg(`불러오기 실패: ${result.error}`); setTimeout(() => setSaveMsg(''), 3000); }
      return;
    }
    applyPreset(result.data);
    setSaveMsg(`프리셋 적용: ${result.name}`);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const applyPreset = (data: Record<string, unknown>) => {
    if (data.curType) { setCurType(data.curType as string); setCurMode(data.curMode as WorkMode); }
    if (data.selectedTool) setSelectedTool(data.selectedTool as string);
    if (data.ep) setEp(data.ep as string);
    if (data.sc) setSc(data.sc as string);
    if (data.cut) setCut(data.cut as string);
    if (data.ex1 !== undefined) setEx1(data.ex1 as string);
    if (data.ex2 !== undefined) setEx2(data.ex2 as string);
    if (data.aname !== undefined) setAname(data.aname as string);
    if (data.aex1 !== undefined) setAex1(data.aex1 as string);
    if (data.aex2 !== undefined) setAex2(data.aex2 as string);
    if (data.zones) setZones(data.zones as Record<string, string>);
    if (data.prompt_en) setPrevEn(data.prompt_en as string);
    if (data.prompt_ko) setPrevKo(data.prompt_ko as string);
  };

  const handleOpenFolder = async () => {
    const root = await ensureProjRoot();
    if (!root) return;
    const relPath = buildPath();
    const folder = `${root}/${relPath}`;
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

      {/* 덮어쓰기 확인 모달 */}
      {overwritePending && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>파일 이미 존재</div>
            <div className={styles.modalMsg}>같은 이름의 파일이 이미 있습니다.<br />JSON과 이미지를 덮어씁니다.</div>
            <div className={styles.modalBtns}>
              <button className={styles.btn} onClick={() => setOverwritePending(null)}>취소</button>
              <button className={styles.btn} onClick={async () => {
                const p = overwritePending;
                setOverwritePending(null);
                const folder = p.filePath.substring(0, p.filePath.lastIndexOf('/'));
                const base = p.filePath.replace(/\.json$/, '').split('/').pop()!;
                const r = await nextVersion(folder, base);
                if (!r.ok) { setSaveMsg(`버전업 실패: ${r.error}`); setTimeout(() => setSaveMsg(''), 3000); return; }
                const newPath = `${folder}/${r.next_name}`;
                const newBaseName = r.next_name!.replace('.json', '');
                await doSave(newPath, { ...(p.data as Record<string,unknown>), filename: newBaseName });
              }}>버전업</button>
              <button className={`${styles.btn} ${styles.btnP}`} onClick={async () => {
                const p = overwritePending;
                setOverwritePending(null);
                await doSave(p.filePath, p.data);
              }}>덮어쓰기</button>
            </div>
          </div>
        </div>
      )}

      {/* 프리셋 불러오기 모달 */}

      {/* 프로젝트 생성/수정 모달 */}
      {projModal && (
        <div className={styles.modalBg}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>{projModal.mode === 'create' ? '새 프로젝트' : '프로젝트 수정'}</div>
            <input className={styles.modalInput} placeholder="프로젝트 코드 (예: AN2601)" value={modalCode} onChange={e => setModalCode(e.target.value.toUpperCase())} />
            <input className={styles.modalInput} placeholder="프로젝트 이름" value={modalName} onChange={e => setModalName(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, margin: '8px 0', fontSize: 12 }}>
              {(['ep', 'sc', 'cut'] as const).map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', textTransform: 'uppercase' }}>
                  <input type="checkbox" checked={modalStruct[k]} onChange={e => setModalStruct(s => ({ ...s, [k]: e.target.checked }))} />
                  {k}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {modalRoot ? `${modalRoot}/${modalCode || '…'}` : '상위 폴더를 선택해주세요'}
              </div>
              <button className={styles.btnSm} onClick={async () => {
                const result = await pickFolder();
                if (result.ok && result.path) setModalRoot(result.path);
              }}>
                <i className="ti ti-folder-open" style={{ fontSize: 11 }} />상위 폴더 선택
              </button>
            </div>
            <div className={styles.modalBtns}>
              <button className={styles.btn} onClick={() => setProjModal(null)}>취소</button>
              <button className={`${styles.btn} ${styles.btnP}`} disabled={!modalCode.trim()} onClick={handleProjModalConfirm}>
                {projModal.mode === 'create' ? '확인' : '수정'}
              </button>
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
                {projects.map((p, i) => (
                  <div key={p.code} className={`${styles.ddItem} ${i === projIdx ? styles.ddItemCur : ''}`}
                    onClick={() => {
                      setProjIdx(i); setDdOpen(false);
                      saveSettings('', { projects, gptModel, modelList, imageModel, imageModelList, lastProjCode: p.code }, false);
                    }}>
                    {p.name}<small>{p.code}</small>
                  </div>
                ))}
                <div className={styles.ddDiv} />
                <div className={`${styles.ddItem} ${styles.ddNew}`} onClick={() => { setDdOpen(false); openProjModal('create'); }}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} />새 프로젝트
                </div>
              </div>
            )}
          </div>
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
              onClick={() => {
                setScreen(item.id);
                if (item.id === 'assets') loadAssets();
                if (item.id === 'shots') loadShots();
              }}>
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
                  {[
                    { lbl: 'EP', pfx: 'EP', val: ep, set: setEp, enabled: struct.ep },
                    { lbl: 'SC', pfx: 'SC', val: sc, set: setSc, enabled: struct.sc },
                    { lbl: 'CUT', pfx: 'CUT', val: cut, set: setCut, enabled: struct.cut },
                  ].map(f => (
                    <div key={f.lbl} className={styles.fl} style={{ opacity: f.enabled ? 1 : 0.35 }}>
                      <label>{f.lbl}</label>
                      <div className={styles.ffixed}>
                        <span className={styles.pfx}>{f.pfx}</span>
                        <input type="text" value={f.val} maxLength={5} disabled={!f.enabled} onChange={e => f.set(e.target.value)} style={{ width: 38 }} />
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
                  <div className={styles.prevLabel}>
                    English
                    {prevEn && <button style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-tertiary)', lineHeight: 1 }} title="복사" onClick={() => navigator.clipboard.writeText(prevEn)}><i className="ti ti-copy" style={{ fontSize: 11 }} /></button>}
                  </div>
                  <div className={styles.prevText} style={{ fontStyle: prevEn ? 'normal' : 'italic', color: prevEn ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                    {prevEn || '프롬프트 생성 후 표시됩니다'}
                  </div>
                </div>
                <div className={styles.prevBox}>
                  <div className={styles.prevLabel}>
                    한국어
                    {prevKo && <button style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-tertiary)', lineHeight: 1 }} title="복사" onClick={() => navigator.clipboard.writeText(prevKo)}><i className="ti ti-copy" style={{ fontSize: 11 }} /></button>}
                  </div>
                  <div className={styles.prevText} style={{ fontStyle: prevKo ? 'normal' : 'italic', color: prevKo ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}>
                    {prevKo || '프롬프트 생성 후 표시됩니다'}
                  </div>
                </div>
              </div>
              <div className={styles.arow}>
                <button className={styles.btn} onClick={handleSavePreset}>
                  <i className="ti ti-device-floppy" />설정 저장
                </button>
                <button className={styles.btn} onClick={handleLoadPreset}>
                  <i className="ti ti-download" />설정 불러오기
                </button>
                <div style={{ flex: 1 }} />
                <button className={styles.btn} onClick={handleGenerate} disabled={generating}>
                  <i className="ti ti-sparkles" />{generating ? '생성 중...' : '프롬프트 생성'}
                </button>
                <button className={styles.btn} onClick={handleSave}><i className="ti ti-device-floppy" />프롬프트 저장</button>
                <button className={`${styles.btn} ${styles.btnP}`} onClick={handleGenerateImage} disabled={generatingImg || !lastSavedPath}>
                  <i className="ti ti-photo" />{generatingImg ? '생성 중...' : '이미지 생성'}
                </button>
              </div>
              <div className={styles.arow} style={{ justifyContent: 'flex-end' }}>
                <button className={styles.btn} onClick={async () => {
                  const root = proj.root; if (!root) return;
                  const relPath = buildPath();
                  const imgPath = `${root}/${relPath.replace('prompts', 'images')}${buildName()}.png`;
                  const r = await openFile(imgPath);
                  if (!r.ok) { setSaveMsg('이미지 파일 없음'); setTimeout(() => setSaveMsg(''), 2000); }
                }}>
                  <i className="ti ti-photo" />이미지 열기
                </button>
                <button className={styles.btn} onClick={async () => {
                  const root = proj.root; if (!root) return;
                  const relPath = buildPath();
                  await openFolder(`${root}/${relPath.replace('prompts', 'images')}`);
                }}>
                  <i className="ti ti-folder-open" />폴더 열기
                </button>
              </div>
              {saveMsg && <div style={{ fontSize: 11, color: saveMsg.includes('완료') || saveMsg.includes('적용') ? 'var(--color-text-success)' : 'var(--color-text-danger)', marginTop: 4 }}>{saveMsg}</div>}
            </div>
          </div>
        )}

        {/* 프롬프트 검색 */}
        {screen === 'search' && (
          <div className={styles.screen}>
            <div className={styles.searchTop}>
              <select className={styles.scopeSel} value={searchScope} onChange={e => setSearchScope(e.target.value)}>
                <option value="current">{proj.code}</option>
                <option value="all">ALL</option>
                {projects.filter((_, i) => i !== projIdx).map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
              </select>
              <div className={styles.sbar}>
                <i className="ti ti-search" style={{ fontSize: 13, color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                <input type="text" placeholder="프롬프트, 파일명 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--color-text-primary)', width: '100%', outline: 'none' }} />
              </div>
              <button className={styles.btn} onClick={handleSearch}>검색</button>
              <button className={styles.btn} style={{ padding: '5px 7px' }} onClick={() => { setSearchQuery(''); setSearched(false); setSearchResults([]); }}>
                <i className="ti ti-x" />
              </button>
            </div>
            {!searched ? (
              <div className={styles.searchEmpty}>
                <i className="ti ti-search" style={{ fontSize: 28, color: 'var(--color-text-tertiary)' }} />
                <p>검색어를 입력하세요</p>
                <small>프롬프트 내용, 파일명, 어셋명으로 검색 가능</small>
              </div>
            ) : searching ? (
              <div className={styles.searchEmpty}>
                <p style={{ color: 'var(--color-text-tertiary)' }}>검색 중...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className={styles.searchEmpty}>
                <i className="ti ti-mood-empty" style={{ fontSize: 28, color: 'var(--color-text-tertiary)' }} />
                <p>검색 결과가 없습니다</p>
                <small>{searchQuery}</small>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{searchResults.length}개 결과</div>
                {searchResults.map((r, i) => {
                  const d = r.data;
                  const filename = String(d.filename || '');
                  const tool = String(d.tool || '');
                  const promptEn = String(d.prompt_en || '');
                  const date = String(d.created_at || '');
                  const version = String(d.version || '001');
                  const type = String(d.type || '');
                  return (
                    <div key={i} className={styles.rcard}>
                      <div className={styles.rtop}>
                        <div className={styles.rid}>{filename}</div>
                        <div className={styles.rmeta}>
                          <span className={`${styles.badge} ${styles.bShot}`}>{type}</span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{tool}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'flex-start' }}>
                        <Thumbnail jsonPath={r.file} />
                        <div className={styles.rprompt}>{promptEn}</div>
                      </div>
                      <div className={styles.rfoot}>
                        <div className={styles.rstat}><i className="ti ti-clock" style={{ fontSize: 11 }} />{date}</div>
                        <div className={styles.rstat}><i className="ti ti-versions" style={{ fontSize: 11 }} />V{version}</div>
                        <div className={styles.ract}>
                          <button className={styles.btnSm} onClick={() => openFolder(r.file.substring(0, r.file.lastIndexOf('/')))}>
                            <i className="ti ti-folder-open" style={{ fontSize: 10 }} />경로 열기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 어셋 관리 */}
        {screen === 'assets' && (
          <div className={styles.screen}>
            {[
              { type: 'CHR', icon: 'ti-user', label: '캐릭터 (CHR)' },
              { type: 'PROP', icon: 'ti-box', label: '프랍 (PROP)' },
              { type: 'BG', icon: 'ti-mountain', label: '배경 (BG)' },
              { type: 'DES', icon: 'ti-bulb', label: '디자인 이미지 (DES)' },
            ].map(g => {
              const items = assets[g.type] || [];
              return (
                <div key={g.type} className={styles.assetGroup}>
                  <div className={styles.assetGroupHd}><i className={`ti ${g.icon}`} />{g.label}</div>
                  {items.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-tertiary)' }}>어셋 없음</div>
                  ) : items.map(item => (
                    <div key={item.name} className={styles.assetRow}>
                      <div className={styles.assetName}>{item.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={styles.verTags}>{item.versions.map(v => <span key={v} className={styles.verTag}>{v}</span>)}</div>
                        <button className={styles.btnSm} onClick={() => openFolder(`${proj.root}/_assets/prompts`)}><i className="ti ti-folder-open" style={{ fontSize: 10 }} />폴더</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* 샷 목록 */}
        {screen === 'shots' && (
          <div className={styles.screen}>
            {Object.keys(shots).length === 0 ? (
              <div className={styles.searchEmpty}>
                <i className="ti ti-layout-list" style={{ fontSize: 28, color: 'var(--color-text-tertiary)' }} />
                <p>샷 데이터가 없습니다</p>
                <small>prompts 폴더에 EP/SC/CUT 구조가 있어야 합니다</small>
              </div>
            ) : Object.entries(shots).map(([ep, scenes]) => (
              <div key={ep} className={styles.epBlock}>
                <div className={styles.epHd}><i className="ti ti-chevron-down" style={{ fontSize: 11 }} />{ep}</div>
                {Object.entries(scenes).map(([sc, cuts]) => (
                  <div key={sc} className={styles.scBlock}>
                    <div className={styles.scHd}><i className="ti ti-minus" style={{ fontSize: 10 }} />{sc}</div>
                    <div className={styles.cutRow}>
                      {cuts.map(c => (
                        <span key={c.cut} className={`${styles.cutTag} ${c.has ? styles.cutTagHas : styles.cutTagNo}`}>{c.cut}</span>
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
                  <input className={styles.apiInput} type="password" placeholder="API Key" value={apiKeys[t] || ''}
                    onChange={e => {
                      const newKeys = { ...apiKeys, [t]: e.target.value };
                      setApiKeys(newKeys);
                      saveSettings('', newKeys, true);
                    }} />
                  <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => setExtraTools(et => et.filter(x => x !== t))}>
                    <i className="ti ti-trash" style={{ fontSize: 10 }} />
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingHd}>프로젝트 관리</div>
              {projects.map((p, i) => (
                <div key={p.code} className={styles.apiRow}>
                  <div className={styles.apiName} style={{ fontWeight: 600 }}>{p.code}</div>
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <div>{p.name}</div>
                    {p.root && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.root}</div>}
                    {!p.root && <div style={{ fontSize: 10, color: 'var(--color-warn, #f59e0b)' }}>경로 없음</div>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    {(['ep','sc','cut'] as const).filter(k => p.structure[k]).map(k => k.toUpperCase()).join('·')}
                  </div>
                  <button className={styles.btnSm} onClick={() => openProjModal('edit', i)}>
                    <i className="ti ti-edit" style={{ fontSize: 10 }} />
                  </button>
                  <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={() => {
                    const updated = projects.filter((_, j) => j !== i);
                    if (i <= projIdx && projIdx > 0) setProjIdx(idx => idx - 1);
                    saveProjects(updated);
                  }}>
                    <i className="ti ti-trash" style={{ fontSize: 10 }} />
                  </button>
                </div>
              ))}
              <div style={{ marginTop: 6 }}>
                <button className={styles.btn} onClick={() => openProjModal('create')}>
                  <i className="ti ti-plus" style={{ fontSize: 11 }} />새 프로젝트 추가
                </button>
              </div>
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingHd}>AI 모델 설정</div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>ChatGPT 모델</div>
                  <div className={styles.settingSub}>프롬프트 생성에 사용할 모델</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={gptModel} onChange={e => saveModel(e.target.value, modelList)}
                    style={{ fontSize: 11, padding: '4px 7px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}>
                    {modelList.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
              </div>
              <div className={styles.settingRow}>
                <div>
                  <div className={styles.settingLabel}>이미지 생성 모델</div>
                  <div className={styles.settingSub}>DALL-E 이미지 생성에 사용할 모델</div>
                </div>
                <select value={imageModel} onChange={e => saveModel(gptModel, modelList, e.target.value, imageModelList)}
                  style={{ fontSize: 11, padding: '4px 7px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}>
                  {imageModelList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.settingRow}>
                <div><div className={styles.settingLabel}>모델 목록 갱신</div><div className={styles.settingSub}>OpenAI에서 최신 모델 목록 가져오기</div></div>
                  <button className={styles.btnSm} disabled={fetchingModels} onClick={async () => {
                    const key = apiKeys['ChatGPT'];
                    if (!key) { setSaveMsg('ChatGPT API 키를 먼저 입력해주세요.'); setTimeout(() => setSaveMsg(''), 3000); return; }
                    setFetchingModels(true);
                    const result = await fetchModels(key);
                    if (result.ok && result.models) {
                      const list = result.models;
                      const model = list.includes(gptModel) ? gptModel : list[0];
                      const imgList = result.image_models ?? imageModelList;
                      const imgModel = imgList.includes(imageModel) ? imageModel : imgList[0];
                      await saveModel(model, list, imgModel, imgList);
                      setSaveMsg(`모델 목록 갱신 완료 (텍스트 ${list.length}개, 이미지 ${imgList.length}개)`);
                    } else {
                      setSaveMsg(`갱신 실패: ${result.error}`);
                    }
                    setFetchingModels(false);
                    setTimeout(() => setSaveMsg(''), 3000);
                  }}>
                    <i className={`ti ${fetchingModels ? 'ti-loader' : 'ti-refresh'}`} style={{ fontSize: 10 }} />
                    {fetchingModels ? '갱신 중...' : '목록 갱신'}
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.settingGroup}>
              <div className={styles.settingHd}>기타</div>
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
