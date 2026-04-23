import React, { useRef, useState, useEffect } from 'react';
import { useFamily } from '../../state/FamilyContext';
import { CalendarView } from '../calendar/CalendarView';
import { exportGraphJSON, importGraphJSON, clearAllData, setDarkMode, getNotificationSettings, setNotificationSettings } from '../../storage/StorageService';
import { showToast } from '../../utils/toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { fireInterstitialAd } from '../ads/InterstitialAd';


export function SettingsPage() {
  const { state, dispatch } = useFamily();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmImport, setConfirmImport] = useState<{ count: number; graph: import('../../models/types').FamilyGraph } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const settings = getNotificationSettings();
    setNotifEnabled(settings.enabled);
    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, []);

  const personCount = Object.keys(state.graph.persons).length;
  const edgeCount = state.graph.edges.length;
  const deceasedCount = Object.values(state.graph.persons).filter(p => p.deathYear).length;

  const dark = state.darkMode;
  const cardBg = dark ? '#1F2937' : 'white';
  const cardBorder = dark ? '#374151' : '#E8DCC8';
  const textPrimary = dark ? '#F3F4F6' : '#3D2B1F';
  const textSecondary = dark ? '#9CA3AF' : '#A09080';

  const handleExport = () => {
    exportGraphJSON(state.graph);
    fireInterstitialAd('데이터를 내보냈어요!');
  };

  const handleExportPDF = () => {
    const perspPerson = state.graph.persons[state.perspectivePersonId];
    const persons = Object.values(state.graph.persons);
    const rows = persons.map(p => {
      const rel = state.relationships.get(p.id);
      const isRoot = p.id === state.perspectivePersonId;
      const title = isRoot ? '기준 인물 (나)' : (rel?.title || '-');
      const chon = isRoot ? '-' : rel ? (rel.chon === -1 ? '배우자' : `${rel.chon}촌`) : '-';
      return `<tr>
        <td>${p.name}</td>
        <td>${p.gender === 'M' ? '남' : '여'}</td>
        <td>${title}</td>
        <td>${chon}</td>
        <td>${p.birthYear || '-'}</td>
        <td>${p.deathYear ? `${p.deathYear} †` : '-'}</td>
        <td>${p.memo || '-'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>촌맵 족보</title>
  <style>
    body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; padding: 40px; color: #3D2B1F; max-width: 900px; margin: 0 auto; }
    h1 { color: #8B6914; font-size: 26px; margin-bottom: 4px; }
    .subtitle { color: #A09080; font-size: 13px; margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #8B6914; color: white; padding: 10px 8px; text-align: left; }
    td { padding: 9px 8px; border-bottom: 1px solid #E8DCC8; vertical-align: top; }
    tr:nth-child(even) td { background: #FFF8DC; }
    .footer { margin-top: 24px; font-size: 11px; color: #A09080; text-align: right; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>&#127795; 촌맵 족보</h1>
  <div class="subtitle">기준 인물: ${perspPerson?.name || '나'} &nbsp;·&nbsp; 생성일: ${new Date().toLocaleDateString('ko-KR')} &nbsp;·&nbsp; 총 ${persons.length}명</div>
  <table>
    <thead><tr><th>이름</th><th>성별</th><th>호칭</th><th>촌수</th><th>출생연도</th><th>사망연도</th><th>메모</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">촌맵 (chonmap.vercel.app)</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      showToast('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요', 'error', 4000);
    }
  };

  const handleSaveImage = () => {
    // 설정 탭에서는 SVG가 없으므로 가계도 탭으로 전환 후 캡처
    let svgEl = document.querySelector('svg');
    if (!svgEl) {
      dispatch({ type: 'SET_TAB', tab: 'tree' });
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.querySelector('svg');
          if (el) doSaveImage(el);
          else showToast('가계도를 찾을 수 없습니다', 'error');
        }, 100);
      });
      return;
    }
    doSaveImage(svgEl);
  };

  const doSaveImage = (svgEl: SVGSVGElement) => {

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // 제목 추가
    const vb = svgEl.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 400, 300];
    const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleEl.setAttribute('x', String(vb[0] + vb[2] / 2));
    titleEl.setAttribute('y', String(vb[1] - 5));
    titleEl.setAttribute('text-anchor', 'middle');
    titleEl.setAttribute('font-size', '14');
    titleEl.setAttribute('font-weight', '700');
    titleEl.setAttribute('fill', '#8B6914');
    titleEl.textContent = '\uD83C\uDF33 촌맵 가계도';
    clone.insertBefore(titleEl, clone.firstChild);

    // 뷰박스 확장 (제목 공간) + 명시적 크기 지정
    clone.setAttribute('viewBox', `${vb[0]} ${vb[1] - 25} ${vb[2]} ${vb[3] + 40}`);
    clone.setAttribute('width', String(Math.max(vb[2], 400)));
    clone.setAttribute('height', String(Math.max(vb[3] + 40, 300)));
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // 범례 추가
    const legendY = vb[1] + vb[3] + 5;
    const legendG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const cx = vb[0] + vb[2] / 2;
    // 혈연
    const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1', String(cx - 80)); l1.setAttribute('y1', String(legendY));
    l1.setAttribute('x2', String(cx - 65)); l1.setAttribute('y2', String(legendY));
    l1.setAttribute('stroke', '#B8A88A'); l1.setAttribute('stroke-width', '2');
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', String(cx - 60)); t1.setAttribute('y', String(legendY + 4));
    t1.setAttribute('font-size', '8'); t1.setAttribute('fill', '#A09080');
    t1.textContent = '혈연';
    // 배우자
    const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1', String(cx - 10)); l2.setAttribute('y1', String(legendY));
    l2.setAttribute('x2', String(cx + 5)); l2.setAttribute('y2', String(legendY));
    l2.setAttribute('stroke', '#E8A0B0'); l2.setAttribute('stroke-width', '2');
    l2.setAttribute('stroke-dasharray', '4,3');
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', String(cx + 10)); t2.setAttribute('y', String(legendY + 4));
    t2.setAttribute('font-size', '8'); t2.setAttribute('fill', '#A09080');
    t2.textContent = '배우자';
    legendG.append(l1, t1, l2, t2);
    clone.appendChild(legendG);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = dark ? '#111827' : '#FDF6E3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `chonmap_${new Date().toISOString().slice(0,10)}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
        fireInterstitialAd('가계도 이미지를 저장했어요!');
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('이미지 변환에 실패했습니다', 'error');
    };
    img.src = url;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const graph = await importGraphJSON(file);
      setConfirmImport({ count: Object.keys(graph.persons).length, graph });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '파일을 불러올 수 없습니다', 'error');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => setConfirmClear(true);

  const handleToggleNotification = async () => {
    if (!('Notification' in window)) {
      showToast('이 브라우저는 알림을 지원하지 않습니다', 'error');
      return;
    }
    if (!notifEnabled) {
      // 켜기: 권한 요청
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== 'granted') {
        showToast('알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.', 'error', 4000);
        return;
      }
      setNotifEnabled(true);
      setNotificationSettings({ enabled: true, lastCheckDate: '' });
      showToast('생일 알림이 켜졌습니다 🎂', 'success');
    } else {
      // 끄기
      setNotifEnabled(false);
      setNotificationSettings({ enabled: false, lastCheckDate: '' });
      showToast('생일 알림이 꺼졌습니다', 'info');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: '촌맵 - 우리 가족 가계도',
      text: '한국 촌수 기반 가계도 앱 촌맵을 소개합니다! 가족 관계와 호칭을 한눈에 확인하세요.',
      url: 'https://chonmap.vercel.app',
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자가 취소한 경우 무시
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast('링크가 복사되었습니다!', 'success');
      } catch {
        showToast('https://chonmap.vercel.app', 'info', 5000);
      }
    }
  };

  const handleToggleDarkMode = () => {
    const newValue = !state.darkMode;
    setDarkMode(newValue);
    dispatch({ type: 'SET_DARK_MODE', darkMode: newValue });
  };

  const btnStyle: React.CSSProperties = {
    background: cardBg, border: `1px solid ${cardBorder}`,
    borderRadius: 14, padding: '12px 16px', textAlign: 'left', cursor: 'pointer', width: '100%',
  };

  return (
    <>
    <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, marginBottom: 20 }}>설정</h1>

      {/* 통계 */}
      <div style={{
        background: dark ? 'linear-gradient(135deg, #374151, #1F2937)' : 'linear-gradient(135deg, #FFF8DC, #FAEBD7)',
        borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${cardBorder}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#FBBF24' : '#8B6914', marginBottom: 8 }}>
          &#127795; 가계도 현황
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#FBBF24' : '#8B6914' }}>{personCount}</div>
            <div style={{ fontSize: 11, color: textSecondary }}>가족 수</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#FBBF24' : '#8B6914' }}>{edgeCount}</div>
            <div style={{ fontSize: 11, color: textSecondary }}>관계 수</div>
          </div>
          {deceasedCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#9CA3AF' : '#6B7280' }}>{deceasedCount}</div>
              <div style={{ fontSize: 11, color: textSecondary }}>고인</div>
            </div>
          )}
        </div>
      </div>

      {/* 기념일 캘린더 */}
      <div style={{ background: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${cardBorder}` }}>
        <button onClick={() => setShowCalendar(v => !v)} style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary, textAlign: 'left' }}>📅 기념일 캘린더</div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 2, textAlign: 'left' }}>가족 생일·기일 한눈에 보기</div>
          </div>
          <span style={{ color: textSecondary, fontSize: 14 }}>{showCalendar ? '▲' : '▼'}</span>
        </button>
        {showCalendar && <div style={{ marginTop: 14 }}><CalendarView /></div>}
      </div>

      {/* 생일 알림 */}
      {'Notification' in window && (
        <div style={{
          background: cardBg, borderRadius: 16, padding: 16, marginBottom: 12,
          border: `1px solid ${cardBorder}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: notifPermission === 'denied' ? 8 : 0 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>
                🎂 생일 알림
              </div>
              <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                {notifPermission === 'denied'
                  ? '브라우저에서 알림이 차단됨'
                  : '앱 실행 시 가족 생일을 알려드려요'}
              </div>
            </div>
            <button onClick={handleToggleNotification} disabled={notifPermission === 'denied'} style={{
              width: 50, height: 28, borderRadius: 14, border: 'none', cursor: notifPermission === 'denied' ? 'not-allowed' : 'pointer',
              background: notifEnabled && notifPermission === 'granted' ? '#FBBF24' : '#D1D5DB',
              position: 'relative', transition: 'background 0.2s', opacity: notifPermission === 'denied' ? 0.5 : 1,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3, transition: 'left 0.2s',
                left: notifEnabled && notifPermission === 'granted' ? 25 : 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          {notifPermission === 'denied' && (
            <div style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>
              브라우저 설정 → 사이트 권한 → 알림에서 허용해주세요
            </div>
          )}
        </div>
      )}

      {/* 다크모드 */}
      <div style={{
        background: cardBg, borderRadius: 16, padding: 16, marginBottom: 12,
        border: `1px solid ${cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>
            {dark ? '\u{1F319} 다크 모드' : '\u{2600}\u{FE0F} 라이트 모드'}
          </div>
          <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
            화면 테마를 변경합니다
          </div>
        </div>
        <button onClick={handleToggleDarkMode} style={{
          width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: dark ? '#FBBF24' : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 3, transition: 'left 0.2s',
            left: dark ? 25 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* 데이터 관리 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={handleSaveImage} style={btnStyle}>
          <div style={{ fontWeight: 600, color: textPrimary }}>&#128247; 이미지로 저장</div>
          <div style={{ fontSize: 11, color: textSecondary }}>가계도를 PNG로 다운로드 (제목+범례 포함)</div>
        </button>

        <button onClick={handleExportPDF} style={btnStyle}>
          <div style={{ fontWeight: 600, color: textPrimary }}>&#128196; PDF 족보 내보내기</div>
          <div style={{ fontSize: 11, color: textSecondary }}>가족 목록을 표 형식으로 인쇄/PDF 저장</div>
        </button>

        <button onClick={handleShare} style={btnStyle}>
          <div style={{ fontWeight: 600, color: textPrimary }}>&#128279; 앱 공유하기</div>
          <div style={{ fontSize: 11, color: textSecondary }}>촌맵 링크를 카카오·문자·SNS로 공유</div>
        </button>

        <button onClick={handleExport} style={btnStyle}>
          <div style={{ fontWeight: 600, color: textPrimary }}>&#128190; 데이터 내보내기</div>
          <div style={{ fontSize: 11, color: textSecondary }}>JSON 파일로 백업</div>
        </button>

        <button onClick={() => fileInputRef.current?.click()} style={btnStyle}>
          <div style={{ fontWeight: 600, color: textPrimary }}>&#128194; 데이터 가져오기</div>
          <div style={{ fontSize: 11, color: textSecondary }}>백업 파일에서 복원</div>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />

        <button onClick={handleClear} style={{ ...btnStyle, borderColor: '#F5C6C6' }}>
          <div style={{ fontWeight: 600, color: '#DC2626' }}>&#128465; 데이터 초기화</div>
          <div style={{ fontSize: 11, color: '#F87171' }}>모든 가계도 데이터 삭제</div>
        </button>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: textSecondary }}>
        <p style={{ margin: '4px 0' }}>촌맵 v1.1.0</p>
        <p style={{ margin: '4px 0' }}>한국 촌수 기반 가계도 앱</p>
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'center' }}>
          <a href="/about.html" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>소개</a>
          <span>·</span>
          <a href="/guide.html" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>이용 가이드</a>
          <span>·</span>
          <a href="/chon/" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>촌수 알아보기</a>
          <span>·</span>
          <a href="/privacy.html" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>개인정보처리방침</a>
          <span>·</span>
          <a href="/terms.html" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>이용약관</a>
        </div>
        <div style={{ marginTop: 6, textAlign: 'center' }}>
          <a href="/contact.html" style={{ color: textSecondary, fontSize: 11, whiteSpace: 'nowrap' }}>문의</a>
        </div>
      </div>
    </div>

    {confirmImport && (
      <ConfirmDialog
        message={`${confirmImport.count}명의 가계도를 불러옵니다.\n현재 데이터를 덮어씁니다. 계속하시겠습니까?`}
        confirmLabel="불러오기"
        dark={dark}
        onConfirm={() => { dispatch({ type: 'IMPORT_GRAPH', graph: confirmImport.graph }); setConfirmImport(null); }}
        onCancel={() => setConfirmImport(null)}
      />
    )}
    {confirmClear && (
      <ConfirmDialog
        message={'모든 가계도 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.'}
        confirmLabel="삭제"
        danger
        dark={dark}
        onConfirm={() => { clearAllData(); window.location.reload(); }}
        onCancel={() => setConfirmClear(false)}
      />
    )}
    </>
  );
}
