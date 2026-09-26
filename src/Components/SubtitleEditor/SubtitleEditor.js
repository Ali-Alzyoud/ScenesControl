import React, { useCallback, useState, useRef, useEffect } from 'react'
import { FaSave, FaPlus, FaMinus, FaMendeley, FaChair, Fa500Px, FaSubscript, FaCloudUploadAlt, FaFolderOpen } from 'react-icons/fa'
import { connect, useDispatch, useSelector } from "react-redux";
import SrtClass from '../../common/SrtClass';
import { setSettings_syncConfig, setSubtitle, setSubtitleName } from '../../redux/actions';
import { getSyncConfig, selectSubtitle, selectSubtitleName, selectSubtitleSync, selectVideoName, selectVideoSrc } from '../../redux/selectors';
import { authFetch, getUser } from '../../common/auth';
import store from '../../redux/store';
import Utils from '../../utils/utils';

import './style.css'
import SubtitleRecord from './SubtitleRecord';

function SubtitleEditor(props) {
    const {
        subtitle,
        subtitleSync,
        subtitleName,
        setSubtitle,
        setSubtitleName
    } = props;

    const syncConfig = useSelector(getSyncConfig)
    const dispatch = useDispatch();
    const videoName = useSelector(selectVideoName);
    const videoSrc = useSelector(selectVideoSrc);
    const [reRender, setReRender] = useState(false);
    const checkBox = useRef(null);
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('ar');
    const [languages, setLanguages] = useState([{ code: 'en', name: 'English' }, { code: 'ar', name: 'Arabic' }]);
    const [saveToServer, setSaveToServer] = useState(false);
    const [savingTranslation, setSavingTranslation] = useState(false);

    useEffect(() => {
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        authFetch(`${domain}/api/v1/translate/languages`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.languages?.length) setLanguages(data.languages); })
            .catch(() => {});
    }, []);

    const saveRemote = async () => {
        const domain = localStorage.getItem('domain');
        if (!domain) return;
        let filePath = null;
        if (videoSrc) {
            const bases = [domain + '/static', domain + '/video', domain];
            let rel = videoSrc;
            for (const b of bases) { if (videoSrc.startsWith(b)) { rel = videoSrc.slice(b.length); break; } }
            // videoSrc carries a ?token=... query string for playback auth — strip it before
            // swapping the extension, or the token ends up embedded in the saved server path.
            filePath = rel.split('?')[0].replace(/\.[^/.]+$/, '.srt');
        }
        if (!filePath) {
            const input = window.prompt('Enter server path to save subtitle:', `/${videoName}.srt`);
            if (!input) return;
            filePath = input.startsWith('/') ? input : '/' + input;
        }
        const content = SrtClass.ToString(subtitle);
        try {
            const res = await authFetch(`${domain}/api/v1/files/save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, content }),
            });
            alert(res.ok ? 'Saved to server' : 'Save failed');
        } catch { alert('Save failed'); }
    };

    const saveItems = () => {
        const subtitleToSave = [];
        const time = syncConfig.subtitleDelay;
        const slope = syncConfig.subtitleSlope;

        subtitle.map((record, index) => {
            record.from = record.from * slope + time * 1000;
            record.to = record.to * slope + time * 1000;
            subtitleToSave.push(record);
        })
        const element = document.createElement("a");
        const file = new Blob([SrtClass.ToString(subtitle)], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);

        const filename = videoName ? videoName.split('.').slice(0, -1).join('.') : "untitled";
        element.download = filename + ".srt";
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
    }

    const sync = () => {
        if (subtitleRecords1.length == 1 && subtitleRecords2.length == 1) {
            const recordSrc = subtitleRecords1[0];
            const recordDst = subtitleRecords2[0];
            const time = (recordDst.from - recordSrc.from);
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: time / 1000,
                subtitleSlope: 1,
            }));
            if (inputSlopRef.current) {
                inputSlopRef.current.value = syncConfig.subtitleSlope.toFixed(5);
            }
        } else if (subtitleRecords1.length == 2 && subtitleRecords2.length == 2) {
            const recordSrc1From = Math.min(subtitleRecords1[0].from, subtitleRecords1[1].from);
            const recordSrc2From = Math.max(subtitleRecords1[0].from, subtitleRecords1[1].from);
            const recordDst1From = Math.min(subtitleRecords2[0].from, subtitleRecords2[1].from);
            const recordDst2From = Math.max(subtitleRecords2[0].from, subtitleRecords2[1].from);
            const timeDurationSrc = Math.abs(recordSrc1From - recordSrc2From);
            const timeDurationDst = Math.abs(recordDst1From - recordDst2From);
            const slope = timeDurationDst / timeDurationSrc;
            const delay = recordDst1From - slope * recordSrc1From;
            dispatch(setSettings_syncConfig({
                ...syncConfig,
                subtitleDelay: delay / 1000,
                subtitleSlope: slope,
            }));
            if (inputSlopRef.current) {
                inputSlopRef.current.value = slope.toFixed(5);
            }
        } else {
            alert("Select 1 or 2 records to sync them")
        }
    }

    const slopeInc = () => {
        const slope = syncConfig.subtitleSlope + 0.05
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: slope,
            }
        ))
        if (inputSlopRef.current) {
            inputSlopRef.current.value = slope.toFixed(5);
        }
    }

    const slopeDec = () => {
        const slope = syncConfig.subtitleSlope - 0.01
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: slope,
            }
        ))
        if (inputSlopRef.current) {
            inputSlopRef.current.value = slope.toFixed(5);
        }
    }

    const slopeDecSmall = () => {
        const slope = syncConfig.subtitleSlope - 0.001
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: slope,
            }
        ))
        if (inputSlopRef.current) {
            inputSlopRef.current.value = slope.toFixed(5);
        }
    }

    const slopeDecSmallExtr = () => {
        const slope = syncConfig.subtitleSlope - 0.0001
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: slope,
            }
        ))
        if (inputSlopRef.current) {
            inputSlopRef.current.value = slope.toFixed(5);
        }
        
    }

    const [ratio, setRatio] = useState("1/1");
    
    const slopeChange = () => {
        let newRatio;
        let newSlope;
        if (ratio === "1/1") {
            newRatio = "24/25";
            newSlope = 24 / 25;
        } else if (ratio === "24/25") {
            newRatio = "25/24";
            newSlope = 25 / 24;
        } else {
            newRatio = "1/1";
            newSlope = 1;
        }
        setRatio(newRatio);
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleSlope: newSlope,
            }
        ))
        if (inputSlopRef.current) {
            inputSlopRef.current.value = newSlope.toFixed(5);
        }

    }

    const delayInc = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleDelay: syncConfig.subtitleDelay + 0.5,
            }
        ))
    }

    const delayDec = () => {
        dispatch(setSettings_syncConfig(
            {
                ...syncConfig,
                subtitleDelay: syncConfig.subtitleDelay - 0.5,
            }
        ))
    }

    const hasSyncSubtitleFile = !!(subtitleSync && subtitleSync.length > 0);
    const [subtitleRecords1, setSubtitleRecords1] = useState([]);
    const [subtitleRecords2, setSubtitleRecords2] = useState([]);
    const [showSubtitle, setShowSubtitle] = useState(false);
    const [showFiles, setShowFiles] = useState(false);


    const onCheckSubtitle1 = useCallback((record, checked) => {
        if (checked) {
            setSubtitleRecords1(prev => [...prev, record])
        } else {
            setSubtitleRecords1(subtitleRecords1.filter((item) => {
                return item.from != record.from
            }));
        }
    }, []);

    // Runs the batch translation over the current subtitle, reporting progress via onProgress.
    // Returns the translated records, or null if translation failed (an alert is shown either way).
    const runTranslate = async (onProgress) => {
        const domain = localStorage.getItem('domain');
        if (!domain) { alert('Set a domain in the menu before translating'); return null; }

        const newSubtitle = [...subtitle];
        const SIZE = 20;
        for (let i = 0; i < subtitle.length; i += SIZE) {
            const items = subtitle.slice(i, i + SIZE);
            const texts = items.map((item) => item?.content?.join?.('\n') || '');

            let translations;
            try {
                const res = await authFetch(`${domain}/api/v1/translate/batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: texts, source: sourceLang, target: targetLang }),
                });
                if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Request failed (${res.status})`);
                ({ translations } = await res.json());
            } catch (error) {
                alert('Translate failed: ' + error.message);
                return null;
            }

            for (let it = 0; it < translations.length; it++) {
                const record = newSubtitle[i + it];
                const text = translations[it];
                if (checkBox.current.checked) {
                    record.content = [record.content?.join?.('\n'), text];
                } else {
                    record.content = [text];
                }
            }
            onProgress?.(newSubtitle, (i + items.length) / subtitle.length);
        }
        return newSubtitle;
    }

    const translate = async () => {
        const domain = localStorage.getItem('domain');
        if (saveToServer && !domain) { alert('Set a domain in the menu before translating'); return; }

        setSavingTranslation(saveToServer);
        try {
            const translated = await runTranslate((newSubtitle, progress) => {
                store.dispatch(setSubtitle(newSubtitle));
                setReRender(progress);
            });
            if (!translated || !saveToServer) return;

            // Prefer the loaded subtitle's own server path; fall back to the video's path (matching saveRemote).
            let filePath = subtitleName?.toLowerCase().startsWith('http')
                ? Utils.serverRelativePath(subtitleName, domain)
                : null;
            if (!filePath && videoSrc) {
                const rel = Utils.serverRelativePath(videoSrc, domain);
                if (rel) filePath = rel.replace(/\.[^/.]+$/, '.srt');
            }
            if (!filePath) {
                const input = window.prompt('Enter server path to save subtitle:', `/${videoName}.srt`);
                if (!input) return;
                filePath = input.startsWith('/') ? input : '/' + input;
            }

            const content = SrtClass.ToString(translated);
            const res = await authFetch(`${domain}/api/v1/files/save`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, content }),
            });
            if (res.ok) {
                setSubtitleName(domain + '/static' + filePath);
            } else {
                alert('Save failed');
            }
        } finally {
            setSavingTranslation(false);
        }
    }



    const onCheckSubtitle2 = useCallback(
        (record, checked) => {
            if (checked) {
                setSubtitleRecords2(prev => [...prev, record])
            } else {
                setSubtitleRecords2(subtitleRecords2.filter((item) => {
                    return item.from != record.from
                }));
            }
        },
        [],
    )

    const updateSlope = (event) => {
        try {
            const target = event.target;
            const value = eval(target.value);
            const num = Number(value);
            if(num > 0 && num < 10)
            dispatch(setSettings_syncConfig(
                {
                    ...syncConfig,
                    subtitleSlope: Number(num),
                }
            ))   
        } catch (error) {
            
        }
    }

    const inputSlopRef = useRef();
    useEffect(()=>{
        if (inputSlopRef.current) {
            inputSlopRef.current.value = syncConfig.subtitleSlope.toFixed(5);
        }
    },[])

    const refFiles = useRef();
    const refSelectedIndex = useRef(0);
    const showSubtitleFiles = () => {
        const subtitleToSelect = [];
        const srts = JSON.parse(localStorage.currentList || '[]').srts;
        refSelectedIndex.current = srts.findIndex((item) => item === subtitleName);
        refFiles.current = srts;
        setShowFiles(!showFiles);
    }

    const LoadSubtitle = (url) => {
       if (url.toLowerCase().startsWith('http')) {
        SrtClass.ReadFile(url).then((records) => {
          setSubtitle(records)
          setSubtitleName(url);
        });
      } else {
        setSubtitle([]);
        setSubtitleName("")
      }
    }


    const fileInputRef = useRef(null);
    const openLocalFile = (e) => {
        if (!e.target.files.length) return;
        SrtClass.ReadFile(URL.createObjectURL(e.target.files[0])).then((records) => {
            setSubtitle(records);
            setSubtitleName(e.target.files[0].name);
        });
        e.target.value = '';
    };

    return (
        <div className='editor-container'>
            <input ref={fileInputRef} type='file' accept='.srt,.ass,.ssa' style={{ display: 'none' }} onChange={openLocalFile} />
            <div className='container' onClick={() => fileInputRef.current.click()}>
                <FaFolderOpen className='middle' />
            </div>
            <div className='container' onClick={saveItems}>
                <FaSave className='middle' />
            </div>
            {getUser()?.role === 'admin' && (
                <div className='container' onClick={saveRemote}>
                    <FaCloudUploadAlt className='middle' />
                </div>
            )}
            <div className='container rect' onClick={()=>setShowSubtitle(!showSubtitle)}>
                <span className='middle'>{showSubtitle ? "Hide" : "Show"}</span>
            </div>
            <div className='container rect' onClick={showSubtitleFiles}>
                <span className='middle'>Files</span>
            </div>
            <br /><br />
            <div className='container small' onClick={delayInc}>
                <FaPlus className='middle' />
            </div>
            <span className='middle-text'>Delay {String(syncConfig.subtitleDelay.toFixed(2)).padStart(5, 0)}</span>
            <div className='container small' onClick={delayDec}>
                <FaMinus className='middle' />
            </div>
            <div className='container small' onClick={slopeInc}>
                <FaPlus className='middle' />
            </div>
            <span className='middle-text'>Slope</span>
            <input className='middle-text slope' onInput={updateSlope} ref={inputSlopRef}/>
            <div className='container small' onClick={slopeDec}>
                <FaMinus className='middle' />
            </div>
            <div className='container small' onClick={slopeDecSmall}>
                <FaMinus className='middle' />
            </div>
            <div className='container small' onClick={slopeDecSmallExtr}>
                <FaMinus className='middle' />
            </div>
            <div className='container small' onClick={slopeChange}>
                {ratio}
            </div>
                   <br /><br />
            <div className='container rect' onClick={sync}>
                <span className='middle'>Sync</span>
            </div>
            <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <span className='middle-text'>{'->'}</span>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            {getUser()?.role === 'admin' && (
                <>
                    <input type='checkbox' checked={saveToServer} onChange={(e) => setSaveToServer(e.target.checked)} />
                    <span className='middle-text'>Save</span>
                </>
            )}
            <div className='container rect' onClick={translate}>
                <span className='middle'>{savingTranslation ? `Translating…${(reRender * 100).toFixed(0)}%` : 'Translate'}</span>
            </div>
            <br/>
            <br/>
            <input type='checkbox' ref={checkBox}/><span>Keep original subtitle when translate</span>
            <br/>
            <br/>
            {showFiles ?
                <table style={{marginRight: '20px', display: 'inline-block'}}>
                    {
                        refFiles.current.map((file, index) => {
                            return <div style={{
                                padding: '5px',
                                backgroundColor: refSelectedIndex.current === index ? '#ddd' : '#fff',
                                cursor: 'pointer'
                            }} key={index + file} onClick={() => {
                                LoadSubtitle(file);
                                setShowFiles(false);
                            }}>{file}</div>
                        })
                    }
                </table>
            : null}
            {showSubtitle ? 
            <div className='table-container'>
                <table style={{ float: hasSyncSubtitleFile ? 'left' : 'unset', marginRight: '20px' }}>
                    <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Content</th>
                    </tr>
                    {
                        subtitle.map((record, index) => {
                            return <SubtitleRecord key={`${index}_${reRender}`} record={record} onCheck={onCheckSubtitle1} />
                        })
                    }
                </table>
                {hasSyncSubtitleFile &&
                    <table style={{ float: 'right' }}>
                        <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>Content</th>
                        </tr>
                        {
                            subtitleSync.map((record, index) => {
                                return <SubtitleRecord record={record} dontChange={true} onCheck={onCheckSubtitle2} />
                            })
                        }
                    </table>}
            </div> : null}
        </div>
    )
}


const mapStateToProps = state => {
    const subtitle = selectSubtitle(state);
    const subtitleSync = selectSubtitleSync(state);
    const subtitleName = selectSubtitleName(state);
    return { subtitle, subtitleSync, subtitleName };
};

export default connect(mapStateToProps,
    {
        setSubtitle, setSubtitleName
    })(SubtitleEditor);
