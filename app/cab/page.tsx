'use client';

import { useEffect, useState } from 'react';

// Бэкенд (порт виден только в фоновом запросе, не в адресной строке)
const API = 'https://apex-vpnpay.duckdns.org:8443';

// Точки назначения кнопок
const SITE = 'https://apex-node.net';
const TG_BOT = 'https://t.me/ApexNoderobot';
const DISCORD_BOT = 'https://discord.com/users/1513274011709083668';

type Info = { ok: boolean; active: boolean; days_left: number; token: string };

export default function CabPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'bad'>('loading');
  const [info, setInfo] = useState<Info | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') || '';
    setToken(t);
    if (!t) {
      setState('bad');
      return;
    }
    fetch(`${API}/api/cab?t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d: Info) => {
        if (d && d.ok) {
          setInfo(d);
          setState('ok');
        } else {
          setState('bad');
        }
      })
      .catch(() => setState('bad'));
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>ApexNode <span style={{ fontSize: 26 }}>🚀</span></div>

        {state === 'loading' && <p style={styles.muted}>Загрузка…</p>}

        {state === 'bad' && (
          <p style={styles.muted}>
            Ссылка недействительна или устарела. Открой личный кабинет из приложения Happ
            (кнопка профиля у подписки).
          </p>
        )}

        {state === 'ok' && info && (
          <>
            <p style={styles.status}>
              {info.active ? (
                <>Подписка активна · осталось <b>{info.days_left} дн.</b></>
              ) : (
                <>Подписка не активна</>
              )}
            </p>
            <p style={styles.muted}>Выбери, где продолжить — ты уже авторизован:</p>

            <div style={styles.buttons}>
              <a style={{ ...styles.btn, ...styles.btnPrimary }} href={`${SITE}/?t=${encodeURIComponent(token)}`}>
                🌐 Открыть сайт
              </a>
              <a style={{ ...styles.btn, ...styles.btnTg }} href={`${TG_BOT}?start=${encodeURIComponent(token)}`}>
                ✈️ Telegram-бот
              </a>
              <a style={{ ...styles.btn, ...styles.btnDs }} href={DISCORD_BOT} target="_blank" rel="noreferrer">
                💬 Discord-бот
              </a>
            </div>

            <p style={styles.hint}>
              В Discord после входа в ЛС бота отправь команду <code style={styles.code}>/link {token}</code>,
              чтобы привязать аккаунт.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 30%, #14213d 0%, #0a0e1a 70%)',
    color: '#e8edf7',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(20,28,48,0.85)',
    border: '1px solid rgba(91,141,239,0.25)',
    borderRadius: 20,
    padding: '32px 28px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
    textAlign: 'center',
    backdropFilter: 'blur(8px)',
  },
  logo: { fontSize: 28, fontWeight: 700, marginBottom: 18, letterSpacing: 0.5 },
  status: { fontSize: 17, margin: '8px 0 6px' },
  muted: { color: '#9fb0d0', fontSize: 14, margin: '6px 0 18px' },
  buttons: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
  btn: {
    display: 'block',
    padding: '14px 18px',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'transform .12s ease, opacity .12s ease',
  },
  btnPrimary: { background: '#5b8def', color: '#fff' },
  btnTg: { background: '#229ed9', color: '#fff' },
  btnDs: { background: '#5865f2', color: '#fff' },
  hint: { color: '#7e8db0', fontSize: 12.5, marginTop: 20, lineHeight: 1.5 },
  code: { background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6, fontSize: 12 },
};
