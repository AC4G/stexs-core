#!/bin/bash

SESSION_NAME="stexs-dev"
SERVER_WINDOW="servers"
DEV_WINDOW="development"
CONFIG_FILE="$HOME/.stexs-dev/stexs-dev.conf"

SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
WORK_PATH="$(dirname "/../$SCRIPT_DIR")"

source "$SCRIPT_DIR/utils/package-manager.sh"
source "$SCRIPT_DIR/utils/ide.sh"

# Declare package managers. The format is: [<package manager>]="<OS name>:<command (cmd = IDE command) = ... {cmd} ...>:<tmux compatibility = tmux>"
declare -A PACKAGE_MANAGERS=(
  ["apt"]="Debian/Ubuntu:sudo apt update && sudo apt install -y {cmd}:tmux"
  ["yum"]="RHEL/CentOS:sudo yum install -y {cmd}:tmux"
  ["dnf"]="Fedora:sudo dnf install -y {cmd}:tmux"
  ["pacman"]="Arch Linux:sudo pacman -Syu {cmd}:tmux"
  ["brew"]="macOS:brew install --cask {cmd}:tmux"
  ["zypper"]="openSUSE:sudo zypper install {cmd}:tmux"
  ["apk"]="Alpine:sudo apk add {cmd}:tmux"
  ["snap"]="Universal:sudo snap install {cmd} --classic:tmux"
  ["flatpak"]="Universal:flatpak install flathub {flatpak_id}"
)

# Declare IDEs. The format is: [<ide code>]="<name>:<command>:<flatpak id>"
declare -A IDES=(
  ["vsc"]="Visual Studio Code:code:com.visualstudio.code"
  ["vim"]="Vim:vim:org.vim.Vim"
  ["nvim"]="Neovim:nvim:io.neovim.nvim"
  ["none"]="No IDE"
)

cleanup() {
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null

    if [ -z "$TMUX" ]; then
      echo -e "\n\e[1;32mtmux session '$SESSION_NAME' has been successfully killed.\e[0m"
    fi
  else 
    echo "\ntmux session '$SESSION_NAME' does not exist. No session was killed."
  fi

  exit 0
}

trap cleanup SIGINT

show_help() {
  echo -e "\nstexs-dev - This script automates the setup of your development environment using tmux, "
  echo -e "installs the preferred IDE, and starts the development servers for all services."
  echo -e "\nUsage: stexs-dev [command]\n"
  
  echo -e "Commands:"
  echo -e "  • reconfig  Reconfigure the stexs-dev configuration, including the IDE."
  echo -e "  • kill      Kill the stexs-dev tmux session if it exists."
  echo -e "  • help      Display this help message."
  
  echo -e "\nConfiguration file location: $CONFIG_FILE"
}


if [[ "$1" == "help" ]]; then
  show_help
  exit 0
fi

if [[ "$1" == "reconfig" ]]; then
  select_ide
  echo -e "\n\e[1;32mstexs-dev successfully reconfigured.\e[0m"
  exit 0
fi

if [[ "$1" == "kill" ]]; then
  cleanup
fi

if [[ "$1" == "reset" ]]; then
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Configuration file not found: $CONFIG_FILE. Nothing to reset."
    exit 0
  fi

  echo "Deleting the configuration file at $CONFIG_FILE..."

  rm "$CONFIG_FILE"

  if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "\e[1;31mError: Could not delete the configuration file at $CONFIG_FILE.\e[0m"
    exit 1
  fi

  echo "Configuration file reset successfully."

  exit 0
fi

if [[ "$1" != "" ]]; then
  echo -e "\e[1;31mError: Command '$1' is not recognized. Supported commands can be found by running 'stexs-dev help'.\e[0m"
  exit 1
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  config_dir=$(dirname "$CONFIG_FILE")
  if [[ ! -d "$config_dir" ]]; then
    echo "Creating configuration directory..."
    
    mkdir -p "$config_dir" || {
      echo -e "\e[1;31mError: Failed to create configuration directory at '$config_dir'.\e[0m"
      echo "Please check directory permissions or create it manually."
      exit 1
    }

    echo -e "\e[1;32mConfiguration directory created successfully at '$config_dir'.\e[0m"
  fi

  select_ide
fi

if ! command -v tmux &> /dev/null; then
  echo "tmux is not installed. Checking for supported package manager..."

  local tmux_compatible_pms=$(get_pms true)

  if [[ "${#tmux_compatible_pms[@]}" -eq 0 ]]; then
    echo -e "\nNo supported package manager detected that can install tmux.\nPlease install tmux manually or install one of the following package managers and try again:\n"
    list_pms true

    exit 1
  fi

  echo "Attempting to install tmux..."

  for pm in "${tmux_compatible_pms[@]}"; do
    echo "Trying package manager: $pm"

    local entry="${PACKAGE_MANAGERS[$pm]}"
    IFS=':' read -r _ install_command _ <<< "$entry"
    install_command="${install_command//\{cmd\}/tmux}"

    eval "$install_command"

    if command -v tmux &> /dev/null; then
      echo -e "\n\e[1;32mtmux installed successfully using $pm.\e[0m"
      break
    fi
  done

  if ! command -v tmux &> /dev/null; then
    echo -e "\n\e[1;31mError: Failed to install tmux using all available package managers. Please install it manually.\e[0m"
    exit 1
  fi
fi

tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  if [[ "$(pwd)" != "$WORK_PATH" ]]; then
    cd "$WORK_PATH" || { 
      echo -e "\e[1;31mError: Failed to change to directory $WORK_PATH. Exiting.\e[0m"
      exit 1
    }
  fi

  tmux new-session -d -s $SESSION_NAME -n $SERVER_WINDOW
  tmux set-option -g mouse on
  tmux send-keys -t $SESSION_NAME:$SERVER_WINDOW "pnpm dev" C-m
  tmux new-window -t $SESSION_NAME -n $DEV_WINDOW

  open_ide
fi

tmux attach-session -t $SESSION_NAME
