#!/bin/sh
#
# Install git hooks for the kuma-mcp repository
#

# Get the repository root directory
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_DIR="$REPO_ROOT/scripts"

# Check if scripts directory exists
if [ ! -d "$SCRIPTS_DIR" ]; then
    echo "❌ Error: scripts directory not found at $SCRIPTS_DIR"
    exit 1
fi

# Install commit-msg hook
echo "📦 Installing git hooks..."

if [ -f "$SCRIPTS_DIR/commit-msg" ]; then
    cp "$SCRIPTS_DIR/commit-msg" "$HOOKS_DIR/commit-msg"
    chmod +x "$HOOKS_DIR/commit-msg"
    echo "✅ Installed commit-msg hook"
else
    echo "❌ Error: commit-msg script not found at $SCRIPTS_DIR/commit-msg"
    exit 1
fi

echo ""
echo "🎉 Git hooks installed successfully!"
echo ""
echo "The commit-msg hook will now enforce semantic commit messages."
echo "Format: <type>(<scope>): <subject>"
echo ""
echo "Allowed types: chore, docs, feat, fix, refactor, style, test"
echo ""
