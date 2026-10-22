<?php
$job = $argv[1] ?? 'reconcile';
echo json_encode(['worker' => 'inventory', 'job' => $job, 'handledAt' => gmdate(DATE_ATOM)]) . PHP_EOL;
