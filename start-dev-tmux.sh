#!/bin/bash

SESSION_NAME="stexs-dev"
SERVER_WINDOW="servers"
DEV_WINDOW="development"
CONFIG_FILE="$HOME/.stexs_dev_config"

SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

cleanup() {
  tmux kill-session -t "$SESSION_NAME" 2>/dev/null
  exit 1
}

trap cleanup SIGINT

get_package_manager() {
  if command -v apt &> /dev/null; then
    echo "apt"
  elif command -v yum &> /dev/null; then
    echo "yum"
  elif command -v dnf &> /dev/null; then
    echo "dnf"
  elif command -v pacman &> /dev/null; then
    echo "pacman"
  elif command -v brew &> /dev/null; then
    echo "brew"
  elif command -v zypper &> /dev/null; then
    echo "zypper"
  elif command -v apk &> /dev/null; then
    echo "apk"
  elif command -v snap &> /dev/null; then
    echo "snap"
  elif command -v flatpak &> /dev/null; then
    echo "flatpak"
  else
    echo "none"
  fi
}

PACKAGE_MANAGER=$(get_package_manager)

if [ "$PACKAGE_MANAGER" = "none" ]; then
  echo -e "\nNo supported package manager detected.\nPlease install one of the following package managers to continue:\n"
  echo -e "\t- apt (Debian/Ubuntu)\n\t- yum (RHEL/CentOS)\n\t- dnf (Fedora)\n\t- pacman (Arch)\n\t- brew (macOS)\n\t- zypper (openSUSE)\n\t- apk (Alpine)\n\t- snap (Universal)\n\t- flatpak (Universal)"
  exit 1
fi

install_ide() {
  case $1 in
    "vsc")
      echo "Attempting to install Visual Studio Code..."
      case $PACKAGE_MANAGER in
        "apt") sudo apt update && sudo apt install -y code ;;
        "yum") sudo yum install -y code ;;
        "dnf") sudo dnf install -y code ;;
        "pacman") sudo pacman -Syu code ;;
        "brew") brew install --cask visual-studio-code ;;
        "zypper") sudo zypper install code ;;
        "apk") sudo apk add code ;;
        "snap") sudo snap install code --classic ;;
        "flatpak") flatpak install flathub com.visualstudio.code ;;
      esac
      ;;
    "vim")
      echo "Attempting to install Vim..."
      case $PACKAGE_MANAGER in
        "apt") sudo apt update && sudo apt install -y vim ;;
        "yum") sudo yum install -y vim ;;
        "dnf") sudo dnf install -y vim ;;
        "pacman") sudo pacman -Syu vim ;;
        "brew") brew install vim ;;
        "zypper") sudo zypper install vim ;;
        "apk") sudo apk add vim ;;
        "snap") sudo snap install vim ;;
        "flatpak") flatpak install flathub org.vim.Vim ;;
      esac
      ;;
    "nvim")
      echo "Attempting to install Neovim..."
      case $PACKAGE_MANAGER in
        "apt") sudo apt update && sudo apt install -y neovim ;;
        "yum") sudo yum install -y neovim ;;
        "dnf") sudo dnf install -y neovim ;;
        "pacman") sudo pacman -Syu neovim ;;
        "brew") brew install neovim ;;
        "zypper") sudo zypper install neovim ;;
        "apk") sudo apk add neovim ;;
        "snap") sudo snap install nvim --classic ;;
        "flatpak") flatpak install flathub io.neovim.nvim ;;
      esac
      ;;
  esac
}

select_ide() {
  local valid_choice=false
  while [ "$valid_choice" = false ]; do
    echo "Select your preferred IDE/editor:"
    echo "1) Visual Studio Code"
    echo "2) Vim"
    echo "3) Neovim"
    echo "4) None"
    read -p "Enter the number of your choice: " ide_choice

    case $ide_choice in
      1) echo "ide=vsc" > $CONFIG_FILE; valid_choice=true ;;
      2) echo "ide=vim" > $CONFIG_FILE; valid_choice=true ;;
      3) echo "ide=nvim" > $CONFIG_FILE; valid_choice=true ;;
      4) echo "ide=none" > $CONFIG_FILE; valid_choice=true ;;
      *) echo -e "\e[1;31mError: Invalid choice. Please select a valid option.\e[0m" ;;
    esac
  done
}

open_ide() {
  IDE=$(grep '^ide=' $CONFIG_FILE | cut -d '=' -f2)

  case $IDE in
    "vsc")
      if ! command -v code &> /dev/null; then
        install_ide "vsc"
      fi
      tmux send-keys -t $SESSION_NAME:$DEV_WINDOW "code ." C-m
      ;;
    "vim")
      if ! command -v vim &> /dev/null; then
        install_ide "vim"
      fi
      tmux send-keys -t $SESSION_NAME:$DEV_WINDOW "vim ." C-m
      ;;
    "nvim")
      if ! command -v nvim &> /dev/null; then
        install_ide "nvim"
      fi
      tmux send-keys -t $SESSION_NAME:$DEV_WINDOW "nvim ." C-m
      ;;
    "none")
      ;;
    *)
      repair_ide_selection
      ;;
  esac
}

repair_ide_selection() {
  echo -e "\e[1;31mInvalid IDE choice in config file. Supported options are:\n- Visual Studio Code (vsc)\n- Vim (vim)\n- Neovim (nvim)\n- None (none)\e[0m"

  read -p "Would you like to re-select your preferred IDE? (y/n): " repair_choice
  if [[ "$repair_choice" =~ ^[Yy]$ ]]; then
    select_ide
    open_ide
  else
    echo -e "\n\e[1;31mPlease modify $HOME/.stexs_dev_config by hand and re-run this script.\e[0m"
    exit 1
  fi
}

if [ ! -f "$CONFIG_FILE" ]; then
  select_ide
fi

if ! command -v tmux &> /dev/null; then
  echo "tmux is not installed. Attempting to install it..."
  case $PACKAGE_MANAGER in
    "apt") sudo apt update && sudo apt install -y tmux ;;
    "yum") sudo yum install -y tmux ;;
    "dnf") sudo dnf install -y tmux ;;
    "pacman") sudo pacman -Syu tmux ;;
    "brew") brew install tmux ;;
    "zypper") sudo zypper install tmux ;;
    "apk") sudo apk add tmux ;;
    "snap") sudo snap install tmux ;;
    "flatpak") flatpak install flathub com.tmux.Tmux ;;
  esac
fi

tmux has-session -t $SESSION_NAME 2>/dev/null

if [ $? != 0 ]; then
  tmux new-session -d -s $SESSION_NAME -n $SERVER_WINDOW
  
  tmux set-option -g mouse on

  tmux send-keys -t $SESSION_NAME:$SERVER_WINDOW "cd $SCRIPT_DIR && pnpm dev" C-m

  tmux new-window -t $SESSION_NAME -n $DEV_WINDOW
  tmux send-keys -t $SESSION_NAME:$DEV_WINDOW "cd $SCRIPT_DIR" C-m

  open_ide
fi

tmux attach-session -t $SESSION_NAME
