<?php
namespace Demo;
final class Report {
  public function summary(array $rows): array { return ['rows' => count($rows), 'generatedAt' => gmdate(DATE_ATOM)]; }
}
