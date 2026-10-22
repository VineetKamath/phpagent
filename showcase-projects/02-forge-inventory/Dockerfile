FROM php:8.3.36-cli
WORKDIR /worker
COPY bin ./bin
ENTRYPOINT ["php", "bin/worker.php"]
