FROM php:8.3.35-cli
WORKDIR /worker
COPY bin ./bin
ENTRYPOINT ["php", "bin/worker.php"]
