import os
import logging
import threading
import yaml
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from prometheus_client import start_http_server, Counter, Gauge

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

METRICS_PORT = int(os.getenv("METRICS_PORT", "8000"))

pipeline_started = Gauge("pipeline_started", "Pipeline start timestamp")
pipeline_runs = Counter("pipeline_runs_total", "Total pipeline runs")

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
        elif self.path == "/metrics":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'# pipeline metrics endpoint')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def start_health_server():
    server = HTTPServer(("0.0.0.0", 8080), HealthHandler)
    logger.info("Health server listening on 0.0.0.0:8080")
    server.serve_forever()

def load_config():
    env = os.getenv("PIPELINE_ENV", "dev")
    config_path = Path(__file__).parent / "config" / f"{env}.yaml"
    if config_path.exists():
        with open(config_path) as f:
            return yaml.safe_load(f)
    return {}

def main():
    health_thread = threading.Thread(target=start_health_server, daemon=True)
    health_thread.start()

    start_http_server(METRICS_PORT)
    pipeline_started.set_to_current_time()
    pipeline_runs.inc()

    config = load_config()
    logger.info("Pipeline iniciado - ambiente: %s", os.getenv("PIPELINE_ENV", "dev"))
    logger.info("Configuração carregada: %s", config)

    logger.info("Pipeline aguardando execuções...")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        logger.info("Pipeline encerrado.")

if __name__ == "__main__":
    main()
