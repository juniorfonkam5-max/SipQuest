$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
Write-Host "--- GitHub Configuration ---"
Write-Host "It looks like your authentication wasn't fully saved last time."
Write-Host "Please follow the prompts below to log into GitHub. Select 'Web browser' when asked."
Write-Host "----------------------------
"

gh auth login

Write-Host "
--- Pushing to GitHub ---"
gh repo create SipQuest --public --source=. --remote=origin --push

Write-Host "
All done! Your repository is now live on GitHub."
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
