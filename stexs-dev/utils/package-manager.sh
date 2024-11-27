list_pms() {
  local tmux_compatible="${1:-false}"

  for pm in "${!PACKAGE_MANAGERS[@]}"; do
    local entry="${PACKAGE_MANAGERS[$pm]}"
    IFS=':' read -r os _ tmux_compatibility <<< "$entry"

    if [[ "$tmux_only" == true && "$tmux_compatibility" != "tmux" ]]; then
      continue
    fi

    echo -e "\t• $pm ($os)"
  done
}

get_pms() {
  local tmux_compatible="${1:-false}"
  local -a supported_pms=()

  for pm in "${!PACKAGE_MANAGERS[@]}"; do
    local entry="${PACKAGE_MANAGERS[$pm]}"
    IFS=':' read -r _ _ tmux_compatibility <<< "$entry"

    if [[ "$check_tmux" == true && "$tmux_compatibility" != "tmux" ]]; then
      continue
    fi

    if command -v "$pm" &> /dev/null; then
      supported_pms+=("$pm")
    fi
  done

  echo "${supported_pms[@]}"
}

install_tmux() {
  echo "Attempting to install tmux using available package managers..."

  for pm in "${!PACKAGE_MANAGERS[@]}"; do
    if command -v "$pm" &> /dev/null; then
      local entry="${PACKAGE_MANAGERS[$pm]}"
      IFS=':' read -r description command _ <<< "$entry"

      echo "Trying package manager: $pm ($description)"

      command="${command//\{cmd\}/tmux}"

      echo "Running: $command"
      eval "$command"

      if command -v tmux &> /dev/null; then
        echo -e "\n\e[1;32mTmux installed successfully using $pm.\e[0m"
        return 0
      fi
    fi
  done

  echo -e "\e[1;31mError: Failed to install tmux. Please install it manually.\e[0m"
  return 1
}
