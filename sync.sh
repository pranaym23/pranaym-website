#!/bin/bash

# Ensure script stops on any error
set -e

echo "========================================="
echo "   GitHub Sync & Repository Creator"
echo "========================================="

# 1. Check if git global configuration exists, if not, set up placeholder or prompt
if ! git config --global user.name > /dev/null 2>&1; then
    echo "⚠️ Git user.name is not configured globally."
    read -p "Enter your full name for Git commits: " git_name
    git config --global user.name "$git_name"
fi

if ! git config --global user.email > /dev/null 2>&1; then
    echo "⚠️ Git user.email is not configured globally."
    read -p "Enter your email for Git commits: " git_email
    git config --global user.email "$git_email"
fi

# 2. Check if GitHub CLI is logged in
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Error: You are not logged into GitHub on the terminal."
    echo "Please run this command first to authenticate:"
    echo "    gh auth login"
    echo "Then run this sync script again!"
    exit 1
fi

# 3. Initialize Git repository if needed
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git branch -M main
else
    echo "Git repository already initialized."
fi

# 4. Stage and commit files
echo "Staging files and creating initial commit..."
git add .
git commit -m "initial commit: personal website built with Astro" || echo "No new changes to commit."

# 5. Create GitHub repository and push
echo "Creating new GitHub repository 'pranaym-website'..."
# This command creates the public repo, adds the origin remote, and pushes the main branch
gh repo create pranaym-website --public --source=. --remote=origin --push

echo "========================================="
echo "🎉 Success! Your website is now on GitHub!"
echo "You can check it online on your GitHub profile."
echo "========================================="
