"""End-to-end test: the TV page plus three phones play a whole game, driven only from the phones.

Usage:
  python3 test/e2e.py                      # uses the public relay (what real games use)
  BROKER=ws://127.0.0.1:8888 python3 test/e2e.py   # uses a local relay (node test/broker.js 8888)
Serves ./site on a local port, so run `node build-site.js` first.
"""
import functools, http.server, os, random, sys, threading, time
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
SHOTS = os.environ.get('SHOTS')  # folder for screenshots, optional
BROKER = os.environ.get('BROKER')
CHROME = os.environ.get('CHROME')

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
errors, log, shot_done, trace = [], [], set(), []


def shot(page, name):
    if SHOTS and name not in shot_done:
        shot_done.add(name)
        page.screenshot(path=os.path.join(SHOTS, name + '.png'))


def watch(page, tag):
    page.on('pageerror', lambda e: errors.append(f'{tag}: {e}'))
    page.on('console', lambda m: m.type == 'error' and errors.append(f'{tag} console: {m.text}'))
    page.on('console', lambda m: '[fdm]' in m.text and trace.append(f'{time.strftime("%H:%M:%S")} {tag} {m.text}'))


def dump(tv, phones):
    print('--- diagnostics')
    try:
        print('TV status:', tv.evaluate("(document.querySelector('#pst')||document.querySelector('#screen')).innerText.slice(0,300)"))
    except Exception as e:
        print('TV unreadable', e)
    for i, p in enumerate(phones):
        try:
            print(f'phone {i}:', p.evaluate("document.getElementById('view').innerText.slice(0,200)").replace('\n', ' / '))
        except Exception as e:
            print(f'phone {i} unreadable', e)
    print('trace (last 40):'); print('\n'.join(trace[-40:]))


def view(page):
    return page.evaluate("""(() => {
      const v = document.getElementById('view'); if (!v) return 'none';
      if (v.querySelector('#jf')) return 'form';
      if (v.querySelector('.cbtn:not([disabled])')) return 'cat';
      if (v.querySelector('.dbtn:not([disabled])')) return 'dod';
      if (v.querySelector('.sbtn:not([disabled])')) return 'sab';
      if (v.querySelector('.seq .abtn:not([disabled])')) return 'seq';
      if (v.querySelector('.abtn:not([disabled])')) return 'mc';
      if (v.querySelector('#bz:not([disabled])')) return v.querySelector('#bz').textContent.trim() === 'Steal' ? 'steal' : 'buzz';
      if (v.querySelector('#ta')) return 'type';
      if (v.querySelector('[data-a=start]')) return 'lobby-vip';
      if (v.querySelector('[data-a=ready]')) return 'ready';
      if (v.querySelector('[data-a=next]:not([disabled])')) return 'next';
      if (v.querySelector('.place')) return 'end';
      return 'wait';
    })()""")


slow_seq_done = []
slow_mc_done = []
sab_done = []
held = set()


def act(tv, phones, vs, i, p, v, buzzed):
    if v == 'cat':
        shot(tv, 'tv-cat')
        p.click('.cbtn >> nth=0', timeout=3000)
    elif v == 'mc':
        shot(tv, 'tv-question')
        if not slow_mc_done:
            # mark the screen, wait past a keep-alive ping, and make sure it wasn't redrawn
            slow_mc_done.append(1)
            p.evaluate("document.getElementById('view').insertAdjacentHTML('beforeend','<i id=keepme></i>')")
            p.wait_for_timeout(11500)
            kept = p.evaluate("!!document.getElementById('keepme')")
            log.append('question screen survived a ping: ' + str(kept))
            assert kept, 'phone screen was redrawn by a ping'
        q = p.inner_text('.qtext')
        if not sab_done and q not in held and len(held) < 6:
            # leave the question up for a moment so another team can sabotage it
            held.add(q)
            p.wait_for_timeout(1500)
            return buzzed
        b = p.query_selector_all('.abtn:not([disabled])')
        if b:
            random.choice(b).click(timeout=3000)
    elif v == 'seq':
        items = p.query_selector_all('.seq .abtn')
        if not slow_seq_done:
            # tap two, wait past a keep-alive ping, then finish: the partial order must survive
            slow_seq_done.append(1)
            for b in items[:2]:
                b.click(timeout=3000)
            p.wait_for_timeout(12000)
            picked = p.evaluate("document.querySelectorAll('.seq .abtn:not(.un)').length")
            log.append(f'put-in-order kept {picked}/2 taps after a ping')
            assert picked == 2, 'phone lost its partial answer'
            items = p.query_selector_all('.seq .abtn.un')
        for b in items:
            b.click(timeout=3000)
    elif v in ('ready', 'next', 'lobby-vip') and i == 0:
        p.click('[data-a=ready], [data-a=next], [data-a=start]', timeout=3000)
    elif v in ('buzz', 'steal') and not buzzed:
        tv.wait_for_timeout(random.randint(2500, 5000))
        shot(tv, 'tv-allplay')
        live = [x for x in phones if x.query_selector('#bz:not([disabled])')]
        if live:
            random.choice(live).dispatch_event('#bz:not([disabled])', 'pointerdown', timeout=3000)
            return True
    elif v == 'dod':
        shot(tv, 'tv-gauntlet')
        p.click(random.choice(['.dbtn >> nth=0', '.dbtn >> nth=1']), timeout=3000)
    elif v == 'sab' and slow_mc_done and not sab_done:
        # one team sabotages another's question from its phone
        shot(p, 'phone-sabbox')
        p.click('.sbtn >> nth=0', timeout=3000)
        tv.wait_for_selector('.sabtag', timeout=5000)
        sab_done.append(1)
        shot(tv, 'tv-sabotage')
        log.append('sabotage from a phone: ' + tv.inner_text('.sabtag').replace('\n', ' / ')[:90])
    elif v == 'type':
        shot(tv, 'tv-typing')
        p.fill('#ta', 'wrong guess', timeout=3000)
        p.click('#tf button', timeout=3000)
    return buzzed


with sync_playwright() as pw:
    kw = {'args': ['--no-sandbox']}
    if CHROME:
        kw['executable_path'] = CHROME
    browser = pw.chromium.launch(**kw)
    tv = browser.new_page(viewport={'width': 1600, 'height': 1000})
    watch(tv, 'tv')
    tv.add_init_script("""localStorage.setItem('fs-set', JSON.stringify({teams:['Snitch Seekers','Infinity Squad','Rebel Scum'],cats:['hp','mcu','sw','dis','lotr'],rounds:3,diff:'3',phones:true}))""")
    tv.goto(BASE + '/play/?debug' + (f'&broker={BROKER}' if BROKER else ''))
    tv.wait_for_timeout(2200)
    tv.click('[data-a=toSetup]')
    tv.click('[data-a=step][data-v="3"]')
    tv.click('[data-a=go]')
    tv.wait_for_selector('#qr[data-join]', timeout=30000)
    link = tv.get_attribute('#qr', 'data-join') + '&debug'
    code = tv.inner_text('#rcode').replace('\n', '')
    log.append(f'room {code} via {link.split("?")[0]}')

    phones = []
    for n, name in enumerate(['Matt', 'Sam', 'Jo']):
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        ph = ctx.new_page()
        watch(ph, name)
        ph.goto(link)
        ph.wait_for_selector('#nm')
        ph.fill('#nm', name)
        ph.click('#jf button')
        try:
            ph.wait_for_selector('.tbtn', timeout=25000)
        except Exception:
            phones.append(ph); dump(tv, phones); raise
        phones.append(ph)
        ph.wait_for_timeout(600)
    for n, ph in enumerate(phones):
        ph.click(f'.tbtn[data-v="{n}"]')
        ph.wait_for_timeout(500)
    tv.wait_for_timeout(1000)
    shot(tv, 'tv-lobby')
    shot(phones[0], 'phone-lobby')
    names = tv.inner_text('#lteams')
    assert all(x in names for x in ['Matt', 'Sam', 'Jo']), 'lobby missing players: ' + names
    phones[0].click('[data-a=start]')
    log.append('VIP started the game')

    seen, deadline = set(), time.time() + 420
    while time.time() < deadline:
        tv.wait_for_timeout(300)
        vs = [view(p) for p in phones]
        if all(v == 'end' for v in vs):
            break
        buzzed = False
        for i, (p, v) in enumerate(zip(phones, vs)):
            if v in ('form', 'wait', 'end', 'none') or (v == 'sab' and (sab_done or not slow_mc_done)):
                continue
            seen.add(v)
            shot(p, 'phone-' + v)
            try:
                buzzed = act(tv, phones, vs, i, p, v, buzzed)
            except Exception as e:  # a screen changed under us; look again next pass
                log.append(f'retry {v}: {str(e)[:70]}')
    for p in phones:
        shot(p, 'phone-end')
    final = tv.inner_text('.stand') if tv.query_selector('.stand') else '(no end screen)'
    shot(tv, 'tv-end')
    log.append('phone views seen: ' + ', '.join(sorted(seen)))
    log.append('final: ' + final.replace('\n', ' | '))
    ended = all(view(p) == 'end' for p in phones)
    if not ended:
        dump(tv, phones)
    browser.close()

print('\n'.join(log))
print('errors:', errors or 'none')
ok = ended and not errors and {'cat', 'mc', 'buzz', 'dod'} <= seen
print('RESULT:', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
