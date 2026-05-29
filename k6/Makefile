.PHONY: smoke load stress soak spike full help

BASE_ARGS = run --rm k6 run /scripts

smoke:
	docker compose --profile test run --rm k6 run /scripts/smoke.js

load:
	docker compose --profile test run --rm k6 run /scripts/load.js

stress:
	docker compose --profile test run --rm k6 run /scripts/stress.js

soak:
	docker compose --profile test run --rm k6 run /scripts/soak.js

spike:
	docker compose --profile test run --rm k6 run /scripts/spike.js

full:
	docker compose --profile test run --rm k6 run /scripts/full-suite.js

help:
	@echo "Comandos disponíveis:"
	@echo "  make smoke   - Smoke test (1 VU, 30s)"
	@echo "  make load    - Teste de carga (até 20 VUs, 7min)"
	@echo "  make stress  - Teste de estresse (até 500 VUs, 8min)"
	@echo "  make soak    - Teste de imersão (20 VUs, 70min)"
	@echo "  make spike   - Teste de pico (até 1000 VUs, 5min)"
	@echo "  make full    - Suite completa combinada"
