param(
  [Parameter(Mandatory = $true)] [string] $Owner
)

$ErrorActionPreference = "Stop"
$projects = Get-ChildItem -Directory | Where-Object { $_.Name -match '^\d\d-' }
foreach ($project in $projects) {
  Push-Location $project.FullName
  try {
    git init --initial-branch main
    git config user.name "Vineet Kamath"
    git config user.email "109815957+VineetKamath@users.noreply.github.com"
    git add .
    git commit -m "Add PHP application"
    gh repo create "$Owner/$($project.Name)" --private --source . --push
  } finally {
    Pop-Location
  }
}
