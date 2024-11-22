list_ides() {
  local numerate="${1:-false}"
  local index=1
  ide_names=()
  ide_keys=()

  for key in "${!IDES[@]}"; do
    local entry="${IDES[$key]}"
    IFS=':' read -r name _  <<< "$entry"

    ide_names+=("$name")
    ide_keys+=("$key")

    if [[ "$numerate" == true ]]; then
      echo -e "\t$index) $name ($key)"
      ((index++))
    else
      echo -e "\t• $name ($key)"
    fi
  done
}

install_ide() {
  local ide_code="$1"
  local entry="${IDES[$ide_code]}"

  IFS=':' read -r name command flatpak_id _ <<< "$entry"
  echo "Attempting to install $name..."

  for pm in "${!PACKAGE_MANAGERS[@]}"; do
    if ! command -v "$pm" &> /dev/null; then
      continue
    fi

    local pm_entry="${PACKAGE_MANAGERS[$pm]}"
    IFS=':' read -r _ pm_command _ <<< "$pm_entry"

    local final_command="${pm_command//\{cmd\}/$command}"
    final_command="${final_command//\{flatpak_id\}/$flatpak_id}"

    echo "Using package manager: $pm"
    echo "Running: $final_command"
    eval "$final_command"

    if command -v "$command" &> /dev/null; then
      echo -e "\n\e[1;32m$name installed successfully using $pm.\e[0m"
      return 0
    fi
  done

  echo -e "\e[1;31mError: Failed to install $name. Please check your system or install $name manually.\e[0m"
  return 1
}

select_ide() {
  local pms=$(get_pms)

  if [[ "${#pms[@]}" -eq 0 ]]; then
    echo -e "\e[1;31mNo supported package managers detected on this system.\e[0m"
    echo -e "Please ensure at least one of the following package managers is installed and available:\n"
    list_pms
  fi

  echo "Select your preferred IDE/editor:"
  
  list_ides true

  local ide_keys=("${!IDES[@]}")
  local total_choices="${#ide_keys[@]}"

  while true; do
    read -p "Enter the number of your choice: " choice

    if (( choice >= 1 && choice <= total_choices )); then
      local selected_key="${ide_keys[$((choice - 1))]}"
      local entry="${IDES[$selected_key]}"
      IFS=':' read -r selected_name _ <<< "$entry"

      echo "ide=$selected_key" > "$CONFIG_FILE"
      echo -e "\n\e[1;32m$selected_name selected successfully and saved to $CONFIG_FILE.\e[0m"

      return
    fi

    echo -e "\e[1;31mInvalid choice. Please try again.\e[0m"
  done
}

open_ide() {
  local selected_ide=$(grep '^ide=' "$CONFIG_FILE" | cut -d '=' -f2)

  local entry="${IDES[$selected_ide]}"

  if [[ -z "$entry" ]]; then
    repair_ide_selection $selected_ide
    return
  fi

  IFS=':' read -r ide_name ide_command _ <<< "$entry"

  if ! command -v "$ide_command" &> /dev/null; then
    echo "$ide_name is not installed. Attempting to install..."
    install_ide "$selected_ide"
  fi

  if command -v "$ide_command" &> /dev/null; then
    tmux send-keys -t "$SESSION_NAME:$DEV_WINDOW" "$ide_command ." C-m
  else
    echo -e "\e[1;31mFailed to install or locate $ide_name. Please install it manually.\e[0m"
    return 1
  fi
}

repair_ide_selection() {
  local current_ide="$1"

  echo -e "\e[1;31mThe IDE '$current_ide' specified in the configuration file is invalid.\e[0m"
  echo -e "\nSupported IDE options are:"

  list_ides

  read -p "Would you like to re-select your preferred IDE? (y/n): " repair_choice
  if [[ "$repair_choice" =~ ^[Yy]$ ]]; then
    select_ide
    open_ide
  else
    echo -e "\n\e[1;31mPlease manually edit $CONFIG_FILE or re-run this script to choose a valid IDE.\e[0m"
    cleanup
  fi
}
