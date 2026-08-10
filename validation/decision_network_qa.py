from pathlib import Path

engine = Path('lib/decision-network/engine.ts').read_text(encoding='utf-8')
page = Path('app/decision-network/page.tsx').read_text(encoding='utf-8')

# Source trust is explicitly confidence in visible evidence quality, never flood probability.
assert 'source-confidence, not flood probability' in engine
assert 'missing data as safe' in engine
assert 'A fresh official advisory is present' in engine
assert 'official_override' in engine
assert 'Official instruction takes priority' in engine

# Impact graph is transparent and non-probabilistic.
assert 'computeImpactGraph' in engine
assert 'criticality' in engine and 'vulnerability' in engine and 'recoveryDifficulty' in engine
assert 'flood probability or loss estimate' in page
assert '<strong>not</strong>' in page

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
assert 'acknowledgement only' in page

# No Model v5 coupling or production-model mutation.
assert 'model_v5' not in engine.lower()
assert 'model_v5' not in page.lower()
assert '/api/v1/risk' in page
assert '/api/v1/intelligence/health' in page
assert '/api/evidence/events' in page

print('Flood Decision Network QA: PASS')
