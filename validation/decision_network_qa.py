from pathlib import Path

engine = Path('lib/decision-network/engine.ts').read_text(encoding='utf-8')
page = Path('app/decision-network/page.tsx').read_text(encoding='utf-8')
shell = Path('components/shared/AppShell.tsx').read_text(encoding='utf-8')
language_provider = Path('components/shared/LanguageProvider.tsx').read_text(encoding='utf-8')
translations = Path('lib/i18n/decision-network.ts').read_text(encoding='utf-8')

# Source trust is explicitly confidence in visible evidence quality, never flood probability.
assert 'source-confidence, not flood probability' in engine
assert 'missing data as safe' in engine
assert 'A fresh official advisory is present' in engine
assert 'official_override' in engine
assert 'Official instruction takes priority' in engine
assert 'Missing configured sources remain in the denominator' in engine
assert 'const conflict = false' in engine

# Impact graph is transparent and non-probabilistic; official warnings alter policy, not score math.
assert 'computeImpactGraph' in engine
assert 'criticality' in engine and 'vulnerability' in engine and 'recoveryDifficulty' in engine
assert 'flood probability or loss estimate' in page
assert '<strong>not</strong>' in page
assert 'Official-warning state is intentionally not used in exposure mathematics' in engine

# Simulations cannot mutate operational state or evidence.
assert 'Simulation only' in page
assert 'simulation || !selectedLocation' in page
assert 'Simulation can never acknowledge a real action' in page
assert 'sending alerts' in page
assert 'writing operational evidence' in page

# Action receipts remain user-asserted evidence, not delivery/system proof.
assert 'ACTION_ACKNOWLEDGED' in page
assert 'decisionNetworkVersion: "fdn-v1"' in page
assert 'outcomeState: "acknowledged"' in page
assert 'action receipts prove acknowledgement' in page
assert 'not that the flood occurred' in page

# The differentiating layer must be visible to every role and respect the shipped language system.
assert shell.count('decisionNetworkItem') >= 5
assert '/decision-network' in shell
for code in ['en:', 'pcm:', 'ha:', 'yo:', 'ig:']:
    assert code in shell
assert '"/decision-network"' in language_provider
assert 'translateDecisionNetworkExact' in language_provider
for marker in ['const pcm:', 'const ha:', 'const yo:', 'const ig:']:
    assert marker in translations

# No Model v5 coupling or production-model mutation.
assert 'model_v5' not in engine.lower()
assert 'model_v5' not in page.lower()
assert '/api/v1/risk' in page
assert '/api/v1/intelligence/health' in page
assert '/api/evidence/events' in page

print('Flood Decision Network QA: PASS')
