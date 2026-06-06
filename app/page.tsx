'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const NodeNetwork = dynamic(() => import('@/components/NodeNetwork'), { ssr: false });

const API = 'https://apex-vpnpay.duckdns.org:8443';
const TURNSTILE_SITEKEY = '0x4AAAAAADd0dworcyJGyxk1';

const TITLES: Record<string, string> = { account: 'Личный кабинет', buy: 'Тарифы', install: 'Установка', faq: 'FAQ' };
const KIND: Record<string, string> = { account: 'account', buy: 'pricing', install: 'setup', faq: 'faq' };

const PRICING = [
  { key: '1m',  name: '1 месяц',   price: 99 },
  { key: '3m',  name: '3 месяца',  price: 249, featured: true },
  { key: '6m',  name: '6 месяцев', price: 449 },
  { key: '12m', name: '1 год',     price: 799 },
];

const FAQ: [string, string][] = [
  ['Что такое ApexNode?', 'Распределённая VPN-сеть на серверах в 4 странах с обходом блокировок.'],
  ['Какие устройства?', 'iOS, Android, Windows, macOS, Linux — через приложение Happ.'],
  ['Где взять токен?', 'Открой бота, нажми Профиль — там твоя ссылка-подписка. Токен — часть после /mysub/.'],
];

const HAPP: Record<string, string> = {
  ios:     'https://apps.apple.com/app/id6504287215',
  android: 'https://play.google.com/store/apps/details?id=com.happproxy',
  windows: 'https://www.happ.su/',
  macos:   'https://www.happ.su/',
  linux:   'https://www.happ.su/',
  unknown: 'https://www.happ.su/',
};

const OS_NAMES: Record<string, string> = {
  ios: 'iPhone / iPad', android: 'Android', windows: 'Windows',
  macos: 'macOS', linux: 'Linux', unknown: 'твоего устройства',
};

const PLAT_ICON: Record<string, string> = {
  windows: '🖥️', ios: '📱', iphone: '📱', ipad: '📱',
  android: '🤖', macos: '🍎', mac: '🍎', linux: '🐧',
};
function platIcon(p: string) { return PLAT_ICON[(p || '').toLowerCase()] || '🌐'; }

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  const plat = (navigator as any).platform || '';
  if (/iphone|ipad|ipod/i.test(ua) || (/Mac/.test(plat) && (navigator as any).maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/win/i.test(plat) || /windows/i.test(ua)) return 'windows';
  if (/mac/i.test(plat) || /macintosh/i.test(ua)) return 'macos';
  if (/linux/i.test(plat) || /linux/i.test(ua)) return 'linux';
  return 'unknown';
}

function getDevice(): string {
  let d = localStorage.getItem('apex_device');
  if (!d) {
    d = (window.crypto && (window.crypto as any).randomUUID)
      ? (window.crypto as any).randomUUID()
      : 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('apex_device', d as string);
  }
  return d as string;
}

const bot = () => window.open('https://t.me/ApexNoderobot', '_blank');

function subUrlOf(token: string) {
  return `${API}/mysub/${token}`;
}

function happAdd(token: string) {
  try {
    window.location.href = `happ://add/${btoa(subUrlOf(token))}`;
  } catch {
    alert('Не удалось открыть Happ. Установи приложение и попробуй снова.');
  }
}

async function copySub(token: string) {
  try {
    await navigator.clipboard.writeText(subUrlOf(token));
    alert('Ссылка подписки скопирована');
  } catch {
    alert(subUrlOf(token));
  }
}

export default function Home() {
  const [active, setActive] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'sbp' | 'card'>('sbp');
  const [os, setOs] = useState<string>('unknown');
  const [trialLoading, setTrialLoading] = useState(false);
  const [tsToken, setTsToken] = useState('');
  const [devices, setDevices] = useState<any>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [pricing, setPricing] = useState<any[]>(PRICING);
  useEffect(() => {
    fetch(`${API}/api/plans`)
      .then(r => r.json())
      .then(d => {
        if (d && d.ok && Array.isArray(d.plans)) {
          setPricing(d.plans.map((p: any) => ({ ...p, featured: p.key === '3m' })));
        }
      })
      .catch(() => {});
  }, []);
  const tsRef = useRef<HTMLDivElement>(null);
  const tsWidgetId = useRef<string | null>(null);

  useEffect(() => { setOs(detectOS()); }, []);

  // подгружаем скрипт Cloudflare Turnstile один раз
  useEffect(() => {
    if (document.getElementById('cf-turnstile-script')) return;
    const s = document.createElement('script');
    s.id = 'cf-turnstile-script';
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, []);

  // рендерим виджет, когда открыт кабинет и юзер не залогинен
  useEffect(() => {
    if (active !== 'account' || token) { tsWidgetId.current = null; return; }
    let tries = 0;
    const iv = setInterval(() => {
      const ts = (window as any).turnstile;
      if (ts && tsRef.current && tsWidgetId.current === null) {
        tsRef.current.innerHTML = '';
        tsWidgetId.current = ts.render(tsRef.current, {
          sitekey: TURNSTILE_SITEKEY,
          callback: (t: string) => setTsToken(t),
          'error-callback': () => setTsToken(''),
          'expired-callback': () => setTsToken(''),
        });
        clearInterval(iv);
      }
      if (++tries > 60) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [active, token]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const t = url.searchParams.get('token');
      if (t) {
        localStorage.setItem('apex_token', t);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());
        setToken(t);
      } else {
        const saved = localStorage.getItem('apex_token');
        if (saved) setToken(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (token) { loadProfile(token); loadDevices(token); }
    else { setProfile(null); setDevices(null); }
  }, [token]);

  async function loadProfile(tok: string) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/user/${encodeURIComponent(tok)}`);
      const d = await r.json();
      setProfile(d.ok ? d : { error: 'Токен не найден' });
    } catch {
      setProfile({ error: 'Нет связи с сервером' });
    }
    setLoading(false);
  }

  async function loadDevices(tok: string) {
    setDevLoading(true);
    try {
      const r = await fetch(`${API}/api/devices/${encodeURIComponent(tok)}`);
      const d = await r.json();
      setDevices(d.ok ? d : null);
    } catch { setDevices(null); }
    setDevLoading(false);
  }

  async function delDevice(deviceId: string) {
    if (!token) return;
    try {
      const r = await fetch(`${API}/api/devices/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, device_id: deviceId }),
      });
      const d = await r.json();
      if (d.ok) loadDevices(token);
      else alert('Не удалось удалить устройство.');
    } catch { alert('Нет связи с сервером.'); }
  }

  function saveToken() {
    const t = tokenInput.trim();
    if (!t) return;
    localStorage.setItem('apex_token', t);
    setToken(t);
    setTokenInput('');
  }

  function logout() {
    localStorage.removeItem('apex_token');
    setToken('');
    setProfile(null);
  }

  function resetTurnstile() {
    setTsToken('');
    try {
      const ts = (window as any).turnstile;
      if (ts && tsWidgetId.current) ts.reset(tsWidgetId.current);
    } catch {}
  }

  async function getTrial() {
    if (!tsToken) { alert('Секунду — идёт проверка браузера, попробуй ещё раз.'); return; }
    setTrialLoading(true);
    try {
      const r = await fetch(`${API}/api/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: getDevice(), ts: tsToken }),
      });
      const d = await r.json();
      if (d.ok && d.token) {
        localStorage.setItem('apex_token', d.token);
        setToken(d.token);
      } else if (d.error === 'ip_limit') {
        alert('С этого устройства/сети бесплатный доступ уже активировали. Оформи подписку 👇');
        resetTurnstile();
      } else if (d.error === 'captcha') {
        alert('Проверка не пройдена. Обнови страницу и попробуй снова.');
        resetTurnstile();
      } else if (d.error === 'vpn') {
        alert('Похоже, ты под VPN/прокси — отключи его для бесплатного триала, либо оформи подписку.');
        resetTurnstile();
      } else {
        alert('Не получилось активировать. Попробуй позже или оформи подписку.');
        resetTurnstile();
      }
    } catch {
      alert('Нет связи с сервером.');
      resetTurnstile();
    }
    setTrialLoading(false);
  }

  async function buy(plan: string) {
    if (!token) { setActive('account'); return; }
    try {
      const r = await fetch(`${API}/api/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, plan, method }),
      });
      const d = await r.json();
      if (d.ok && d.url) window.location.href = d.url;
      else alert('Не удалось создать платёж. Открой бота или попробуй позже.');
    } catch {
      alert('Нет связи с сервером.');
    }
  }

  const open = !!(active && KIND[active]);
  const kind = active ? KIND[active] : null;
  const expDate = profile?.expire_at ? new Date(profile.expire_at * 1000).toLocaleDateString('ru-RU') : '';

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#040406]">
      <nav className="absolute top-0 left-0 z-10 px-7 py-6 pointer-events-none">
        <span className="pointer-events-auto text-white text-lg" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500, letterSpacing: '0.2em' }}>ApexNode</span>
      </nav>

      <div className="absolute inset-0">
        <NodeNetwork onSelectNode={setActive} />
      </div>

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md z-20 bg-[#080a10]/90 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ fontFamily: "'Jost', sans-serif" }}
      >
        <div className="flex items-center justify-between px-7 py-6 border-b border-white/10">
          <span className="text-white text-sm tracking-[0.3em] uppercase">{active ? TITLES[active] : ''}</span>
          <button onClick={() => setActive(null)} className="text-white/50 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="px-7 py-6 overflow-y-auto h-[calc(100%-80px)]">
          {kind === 'pricing' && (
            <div className="space-y-3">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setMethod('sbp')} className={`flex-1 py-2 rounded-lg text-sm transition ${method === 'sbp' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>СБП</button>
                <button onClick={() => setMethod('card')} className={`flex-1 py-2 rounded-lg text-sm transition ${method === 'card' ? 'bg-white text-black' : 'bg-white/10 text-white/70'}`}>Карта</button>
              </div>
              {pricing.map((p) => (
                <div key={p.key} className={`rounded-xl border p-5 ${p.featured ? 'border-orange-500/60 bg-orange-500/5' : 'border-white/10'}`}>
                  <div className="flex justify-between items-baseline">
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-2xl text-white">{p.price} ₽</div>
                  </div>
                  <button onClick={() => buy(p.key)} className="mt-4 w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-medium text-sm transition">Оформить</button>
                </div>
              ))}
              {!token && <p className="text-white/40 text-xs pt-2">Чтобы оплатить с сайта, привяжи токен в «Личном кабинете». Или оформи прямо в боте.</p>}
            </div>
          )}

          {kind === 'setup' && (
            <div className="space-y-5 text-white/80">
              <div className="rounded-xl border border-white/10 p-5 space-y-3">
                <div className="text-white/40 text-xs uppercase tracking-wider">Твоё устройство</div>
                <div className="text-white font-medium text-lg">{OS_NAMES[os]}</div>
                <button onClick={() => window.open(HAPP[os], '_blank')} className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-medium text-sm transition">Установить Happ</button>
              </div>
              <ol className="space-y-2 list-decimal list-inside text-white/70 text-sm">
                <li>Установи Happ кнопкой выше</li>
                <li>Нажми «Добавить подписку» — она улетит прямо в Happ</li>
                <li>Жми Connect в приложении 🚀</li>
              </ol>
              <button
                onClick={() => (token ? happAdd(token) : setActive('account'))}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition border border-white/10"
              >
                {token ? 'Добавить подписку в Happ' : 'Сначала войди в кабинет'}
              </button>
            </div>
          )}

          {kind === 'faq' && (
            <div className="space-y-4 text-sm">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <div className="text-white font-medium">{q}</div>
                  <div className="text-white/60 mt-1">{a}</div>
                </div>
              ))}
            </div>
          )}

          {kind === 'account' && (
            <div className="space-y-5">
              {!token && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-5 space-y-3">
                    <div className="text-white font-medium">🎁 3 дня бесплатно</div>
                    <p className="text-white/60 text-sm">Попробуй ApexNode без оплаты и без Telegram — подписка активируется прямо сейчас.</p>
                    <div ref={tsRef} className="min-h-[65px]" />
                    <button onClick={getTrial} disabled={trialLoading || !tsToken} className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-medium text-sm transition">
                      {trialLoading ? 'Активируем…' : (tsToken ? 'Получить 3 дня бесплатно' : 'Проверка браузера…')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-white/50 text-xs">Уже есть подписка? Вставь токен из бота:</p>
                    <input
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Твой токен"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-white/30"
                    />
                    <button onClick={saveToken} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition border border-white/10">Войти по токену</button>
                  </div>
                </div>
              )}

              {token && loading && <p className="text-white/50 text-sm">Загрузка…</p>}

              {token && !loading && profile?.error && (
                <div className="space-y-3">
                  <p className="text-red-400/80 text-sm">{profile.error}</p>
                  <button onClick={logout} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition border border-white/10">Сменить токен</button>
                </div>
              )}

              {token && !loading && profile?.ok && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/10 p-5 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Статус</span>
                      <span className={profile.active ? 'text-emerald-400' : 'text-red-400'}>{profile.active ? 'Активна' : 'Истекла'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Действует до</span>
                      <span className="text-white">{expDate || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Осталось</span>
                      <span className="text-white">{profile.days_left} дн.</span>
                    </div>
                  </div>

                  <button onClick={() => happAdd(token)} className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-medium text-sm transition">📲 Подключить (добавить в Happ)</button>
                  <button onClick={() => copySub(token)} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition border border-white/10">Скопировать ссылку подписки</button>
                  <button onClick={() => setActive('buy')} className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition border border-white/10">Продлить подписку</button>

                  <div className="rounded-xl border border-white/10 p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">Устройства</span>
                      <span className="text-white/40 text-xs">{devices ? `${devices.count} / ${devices.limit}` : ''}</span>
                    </div>
                    {devLoading && <p className="text-white/40 text-xs">Загрузка…</p>}
                    {!devLoading && devices?.devices?.length === 0 && (
                      <p className="text-white/40 text-xs">Пока пусто. Добавь подписку в Happ — устройство появится здесь.</p>
                    )}
                    {!devLoading && devices?.devices?.map((dev: any) => (
                      <div key={dev.device_id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{platIcon(dev.platform)}</span>
                          <div className="min-w-0">
                            <div className="text-white text-sm truncate">{dev.platform || 'Устройство'}</div>
                            <div className="text-white/40 text-xs truncate">···{String(dev.device_id).slice(-6)}</div>
                          </div>
                        </div>
                        <button onClick={() => delDevice(dev.device_id)} className="shrink-0 text-white/40 hover:text-red-400 text-base transition" title="Удалить">🗑</button>
                      </div>
                    ))}
                    {!devLoading && devices && devices.count >= devices.limit && (
                      <p className="text-orange-400/80 text-xs pt-1">Лимит устройств исчерпан. Удали лишнее, чтобы подключить новое.</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <button onClick={() => { loadProfile(token); loadDevices(token); }} className="text-white/50 hover:text-white text-sm transition">↻ Обновить</button>
                    <button onClick={logout} className="text-white/50 hover:text-white text-sm transition">Выйти</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}