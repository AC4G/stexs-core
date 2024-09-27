#!/bin/bash

SESSION_NAME="stexs-dev"
SERVER_WINDOW="servers"
DEV_WINDOW="development"

SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

if ! command -v tmux &> /dev/null; then
  echo "tmux is not installed. Attempting to install it..."

  if command -v apt &> /dev/null; then
    sudo apt update && sudo apt install -y tmux
  elif command -v yum &> /dev/null; then
    sudo yum install -y tmux
  elif command -v pacman &> /dev/null; then
    sudo pacman -Syu tmux
  elif command -v brew &> /dev/null; then
    brew install tmux
  else
    echo -e "\nNo supported package manager detected.\nPlease install tmux manually or install one of the following package managers and retry:\n\n  \e[1;32m- apt\e[0m\n  \e[1;34m- yum\e[0m\n  \e[1;35m- pacman\e[0m\n  \e[1;36m- brew\e[0m\n"
    exit 1
  fi
fi

tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  tmux new-session -d -s $SESSION_NAME -n $SERVER_WINDOW
  
  tmux set-option -g mouse on

  tmux send-keys -t $SESSION_NAME:$SERVER_WINDOW "cd $SCRIPT_DIR && pnpm dev" C-m

  tmux new-window -t $SESSION_NAME -n $DEV_WINDOW
  tmux send-keys -t $SESSION_NAME:$DEV_WINDOW "cd $SCRIPT_DIR && code ." C-m
fi

tmux attach-session -t $SESSION_NAME
