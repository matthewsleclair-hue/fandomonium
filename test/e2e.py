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
errors, log, shot_done = [], [], set()


def shot(page, name):
    if SHOTS and name not in shot_done:
        shot_done.add(name)
        page.screenshot(path=os.path.join(SHOTS, name + '.png'))


def watch(page, tag):
    page.on('pageerror', lambda e: errors.append(f'{tag}: {e}'))
    page.on('console', lambda m: m.type == 'error' and errors.append(f'{tag} console: {m.text}'))


def view(page):
    return page.evaluate("""(() => {
      const v = document.getElementById('view'); if (!v) return 'none';
      if (v.querySelector('#jf')) return 'form';
      if (v.querySelector('.cbtn:not([disabled])')) return 'cat';
      if (v.querySelector('.seq .abtn:not([disabled])')) return 'seq';
      if (v.querySelector('.abtn:not([disabled])')) return 'mc';
      if (v.querySelector('#bz:not([disabled])')) return 'buzz';
      if (v.querySelector('#ta')) return 'type';
      if (v.querySelector('[data-a=start]')) return 'lobby-vip';
      if (v.querySelector('[data-a=ready]')) return 'ready';
      if (v.querySelector('[data-a=next]:not([disabled])')) return 'next';
      if (v.querySelector('.place')) return 'end';
      return 'wait';
    })()""")


with sync_playwright() as pw:
    kw = {'args': ['--no-sandbox']}
    if CHROME:
        kw['executable_path'] = CHROME
    browser = pw.chromium.launch(**kw)
    tv = browser.new_page(viewport={'width': 1600, 'height': 1000})
    watch(tv, 'tv')
    tv.add_init_script("""localStorage.setItem('fs-set', JSON.stringify({teams:['Snitch Seekers','Infinity Squad','Rebel Scum'],cats:['hp','mcu','sw','dis','lotr'],rounds:3,diff:'3',phones:true}))""")
    tv.goto(BASE + '/play/' + (f'?broker={BROKER}' if BROKER else ''))
    tv.wait_for_timeout(2200)
    tv.click('[data-a=go]')
    tv.wait_for_selector('#qr[data-join]', timeout=30000)
    link = tv.get_attribute('#qr', 'data-join')
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
        ph.wait_for_selector('.tbtn', timeout=20000)
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
            if v in ('form', 'wait', 'end', 'none'):
                continue
            seen.add(v)
            shot(p, 'phone-' + v)
            if v == 'cat':
                shot(tv, 'tv-cat')
                p.click('.cbtn >> nth=0')
            elif v == 'mc':
                shot(tv, 'tv-question')
                b = p.query_selector_all('.abtn:not([disabled])')
                random.choice(b).click()
            elif v == 'seq':
                for b in p.query_selector_all('.seq .abtn'):
                    b.click()
            elif v in ('ready', 'next', 'lobby-vip') and i == 0:
                p.click('[data-a=ready], [data-a=next], [data-a=start]')
            elif v == 'buzz' and not buzzed:
                # give the puzzle a few seconds to reveal, then a random phone buzzes
                tv.wait_for_timeout(random.randint(2500, 5000))
                shot(tv, 'tv-allplay')
                q = random.choice([x for x, vv in zip(phones, vs) if vv == 'buzz'])
                q.dispatch_event('#bz', 'pointerdown')
                buzzed = True
            elif v == 'type':
                shot(tv, 'tv-typing')
                p.fill('#ta', random.choice(['wrong guess', p.evaluate('1') and 'x']))
                p.click('#tf button')
    for p in phones:
        shot(p, 'phone-end')
    final = tv.inner_text('.stand') if tv.query_selector('.stand') else '(no end screen)'
    shot(tv, 'tv-end')
    log.append('phone views seen: ' + ', '.join(sorted(seen)))
    log.append('final: ' + final.replace('\n', ' | '))
    ended = all(view(p) == 'end' for p in phones)
    browser.close()

print('\n'.join(log))
print('errors:', errors or 'none')
ok = ended and not errors and {'cat', 'mc', 'buzz'} <= seen
print('RESULT:', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
