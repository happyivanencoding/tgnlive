"""TGN Live owner-only deployment. Existing API credential stays in memory.
Usage: python scripts/configure-cloudflare.py inspect|prepare|publish
"""
import json
import os
from pathlib import Path
import sys
import urllib.request
import urllib.error
import winreg

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / '.runtime'
HOST = 'live.thegreatnovel.com'

def env(name):
    value = os.environ.get(name)
    if value: return value
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as key:
            return str(winreg.QueryValueEx(key, name)[0])
    except FileNotFoundError: return ''

class Cloudflare:
    def __init__(self):
        self.token = next((env(n) for n in ['TGN_CF_API_TOKEN', 'AGENT_MONITOR_CF_API_TOKEN', 'CLOUDFLARE_API_TOKEN', 'JINGYOU_CF_API_TOKEN'] if env(n)), '')
        if not self.token: raise RuntimeError('Existing Cloudflare credential unavailable')

    def call(self, path, method='GET', body=None):
        req = urllib.request.Request('https://api.cloudflare.com/client/v4' + path, method=method,
            headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'},
            data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(req, timeout=25) as response: result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f'Cloudflare {method}: HTTP {error.code}') from None
        if not result.get('success'): raise RuntimeError('Cloudflare request failed')
        return result['result']

def main():
    action = sys.argv[1]
    if action not in ['inspect', 'prepare', 'publish']: raise RuntimeError('Unknown action')
    cf = Cloudflare()
    zones = cf.call('/zones?name=thegreatnovel.com')
    if len(zones) != 1: raise RuntimeError('Expected one zone')
    zone = zones[0]; prefix = '/accounts/' + zone['account']['id']
    apps = cf.call(prefix + '/access/apps')
    matches = [a for a in apps if a.get('domain') == HOST]
    if len(matches) > 1 or (matches and matches[0]['name'] != 'TGN Live'): raise RuntimeError('Access hostname conflict')
    app = matches[0] if matches else None
    diary = next(a for a in apps if a.get('domain') == 'diary.thegreatnovel.com')
    policies = cf.call(prefix + f'/access/apps/{diary["id"]}/policies')
    owners = {r['email']['email'].lower() for p in policies if p.get('decision') == 'allow' for r in p.get('include', []) if 'email' in r}
    if len(owners) != 1: raise RuntimeError('Expected one existing diary owner')
    owner = next(iter(owners))
    team = env('JINGYOU_CF_TEAM_DOMAIN')
    if not team.endswith('.cloudflareaccess.com'): raise RuntimeError('Missing team domain')
    tunnel = next(t for t in cf.call(prefix + '/cfd_tunnel?is_deleted=false') if t['name'] == 'TGN')
    route_path = prefix + f'/cfd_tunnel/{tunnel["id"]}/configurations'
    configuration = cf.call(route_path)['config']
    records = cf.call(f'/zones/{zone["id"]}/dns_records?name={HOST}')
    target = tunnel['id'] + '.cfargotunnel.com'
    if records and (len(records) != 1 or records[0].get('type') != 'CNAME' or records[0].get('content') != target or not records[0].get('proxied')):
        raise RuntimeError('DNS conflict; refusing overwrite')
    routes = [r for r in configuration.get('ingress', []) if r.get('hostname') == HOST]
    expected_route = {'hostname': HOST, 'service': 'http://127.0.0.1:4317'}
    if routes and routes != [expected_route]: raise RuntimeError('Tunnel route conflict')
    if action == 'inspect':
        print(json.dumps({'hostname': HOST, 'tunnelStatus': tunnel['status'], 'accessExists': bool(app), 'dnsExists': bool(records), 'ownerCount': len(owners), 'existingHosts': [r.get('hostname') for r in configuration['ingress']]}))
        return
    RUNTIME.mkdir(exist_ok=True)
    if action == 'prepare':
        if not app:
            body = {'name': 'TGN Live', 'domain': HOST, 'type': 'self_hosted', 'session_duration': '168h', 'auto_redirect_to_identity': False}
            if diary.get('allowed_idps'): body['allowed_idps'] = diary['allowed_idps']
            app = cf.call(prefix + '/access/apps', 'POST', body)
        existing = cf.call(prefix + f'/access/apps/{app["id"]}/policies')
        body = {'name': 'TGN Live owner', 'decision': 'allow', 'include': [{'email': {'email': owner}}], 'require': [], 'exclude': [], 'precedence': 1}
        if existing:
            if len(existing) != 1 or any(existing[0].get(k) != body[k] for k in ['name', 'decision', 'include', 'require', 'exclude']):
                raise RuntimeError('Unexpected policy; refusing automatic modification')
        else: cf.call(prefix + f'/access/apps/{app["id"]}/policies', 'POST', body)
        (RUNTIME / 'remote.json').write_text(json.dumps({'publicUrl': 'https://' + HOST, 'teamDomain': team, 'audience': app['aud'], 'ownerEmail': owner}, indent=2), encoding='utf-8')
        print('Prepared owner-only Access and origin configuration. No DNS/tunnel publication yet.')
        return
    if not app: raise RuntimeError('Prepare first')
    policies = cf.call(prefix + f'/access/apps/{app["id"]}/policies')
    if len(policies) != 1 or policies[0].get('decision') != 'allow' or policies[0].get('include') != [{'email': {'email': owner}}]:
        raise RuntimeError('Expected exactly one owner-only policy')
    with urllib.request.urlopen('http://127.0.0.1:4317/api/health', timeout=10) as response: health = json.load(response)
    if health.get('access') != {'mode': 'owner-only', 'publicUrl': 'https://' + HOST}: raise RuntimeError('Origin not ready')
    before = configuration['ingress']
    if not routes:
        if not before or 'hostname' in before[-1]: raise RuntimeError('Expected tunnel catch-all')
        backup = RUNTIME / 'cloudflare-before.json'
        if not backup.exists(): backup.write_text(json.dumps(configuration, indent=2), encoding='utf-8')
        # Recheck immediately before writing a shared configuration.
        if cf.call(route_path)['config'] != configuration: raise RuntimeError('Concurrent tunnel change; rerun')
        configuration['ingress'] = before[:-1] + [expected_route] + before[-1:]
        cf.call(route_path, 'PUT', {'config': configuration})
    if not records: cf.call(f'/zones/{zone["id"]}/dns_records', 'POST', {'type': 'CNAME', 'name': HOST, 'content': target, 'proxied': True, 'ttl': 1})
    after = cf.call(route_path)['config']['ingress']
    if [r for r in before if r.get('hostname') != HOST] != [r for r in after if r.get('hostname') != HOST]: raise RuntimeError('Unrelated route changed')
    print('Published https://' + HOST + '; all unrelated tunnel routes preserved.')

if __name__ == '__main__': main()
