# PowerShell script for creating separate Frontend and Backend deployment branches

Write-Host "Creating deployment branches for VideoMeet" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if we are in a git repository
try {
    git rev-parse --git-dir 2>&1 | Out-Null
} catch {
    Write-Host "Error: This is not a git repository!" -ForegroundColor Red
    Write-Host "Initialize git: git init" -ForegroundColor Yellow
    exit 1
}

# Get current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Green

# Check for uncommitted changes
$gitStatus = git status --porcelain

if ($gitStatus) {
    Write-Host ""
    Write-Host "Warning: You have uncommitted changes!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to commit them before creating branches? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git add .
        $commitMsg = Read-Host "Enter commit message"
        git commit -m $commitMsg
        Write-Host "Changes committed" -ForegroundColor Green
    } else {
        Write-Host "Aborted. Commit your changes and run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Creating Frontend deployment branch..." -ForegroundColor Cyan

# Check if frontend-deploy branch exists
$frontendBranchExists = git branch --list frontend-deploy

if ($frontendBranchExists) {
    Write-Host "Warning: Branch 'frontend-deploy' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git branch -D frontend-deploy
        git checkout -b frontend-deploy
        git push -f origin frontend-deploy
        Write-Host "Branch 'frontend-deploy' recreated" -ForegroundColor Green
    } else {
        Write-Host "Skipping frontend-deploy creation" -ForegroundColor Gray
    }
} else {
    git checkout -b frontend-deploy
    git push -u origin frontend-deploy
    Write-Host "Branch 'frontend-deploy' created and pushed to remote" -ForegroundColor Green
}

# Return to original branch
git checkout $currentBranch

Write-Host ""
Write-Host "Creating Backend deployment branch..." -ForegroundColor Cyan

# Check if backend-deploy branch exists
$backendBranchExists = git branch --list backend-deploy

if ($backendBranchExists) {
    Write-Host "Warning: Branch 'backend-deploy' already exists" -ForegroundColor Yellow
    $response = Read-Host "Do you want to recreate it? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git branch -D backend-deploy
        git checkout -b backend-deploy
        git push -f origin backend-deploy
        Write-Host "Branch 'backend-deploy' recreated" -ForegroundColor Green
    } else {
        Write-Host "Skipping backend-deploy creation" -ForegroundColor Gray
    }
} else {
    git checkout -b backend-deploy
    git push -u origin backend-deploy
    Write-Host "Branch 'backend-deploy' created and pushed to remote" -ForegroundColor Green
}

# Return to original branch
git checkout $currentBranch

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Created branches:" -ForegroundColor Cyan
git branch -a | Select-String -Pattern "(frontend-deploy|backend-deploy)"

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Frontend deploy to Vercel:" -ForegroundColor Cyan
Write-Host "   - Go to https://vercel.com"
Write-Host "   - Import your repository"
Write-Host "   - Select branch: frontend-deploy (or main)"
Write-Host "   - Root Directory: client"
Write-Host "   - Framework: Vite"
Write-Host ""
Write-Host "2. Backend deploy to Render:" -ForegroundColor Cyan
Write-Host "   - Go to https://render.com"
Write-Host "   - Create PostgreSQL and Redis"
Write-Host "   - Create Web Service (Docker)"
Write-Host "   - Select branch: backend-deploy (or main)"
Write-Host "   - Root Directory: server"
Write-Host ""
Write-Host "3. Detailed instructions:" -ForegroundColor Cyan
Write-Host "   - Quick start: .\QUICK-DEPLOY.md"
Write-Host "   - Full documentation: .\DEPLOYMENT.md"
Write-Host ""
Write-Host "Happy deploying!" -ForegroundColor Green
