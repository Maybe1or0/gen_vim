#--------------------------------------------GENVIM-------------------------------------------------

alias playvideo='alacritty -e vlc ~/afs/video.mp4'


function vim_cmd {

	MOUSE_ID=$(xinput list | grep -i "mouse" | awk -F'id=' '{print $2}' | awk '{print $1}')
	vlc --meta-title "brain3" --qt-minimal-view ~/afs/brainrotvideos/brainrot3.mp4 > /dev/null 2>&1 &
	VLC_PID2=$!
	wait_for_vlc
	vlc --meta-title "brain1" --qt-minimal-view ~/afs/brainrotvideos/brainrot1.mp4 > /dev/null 2>&1 &
	VLC_PID=$!
	wait_for_vlc
	vlc --meta-title "brain2"  --qt-minimal-view ~/afs/brainrotvideos/brainrot2.mp4 > /dev/null 2>&1 &
	VLC_PID1=$!
	wait_for_vlc
	echo $MOUSE_ID
	xinput disable $MOUSE_ID
	
	vim "$@" --cmd "set title titlestring=__genvim__"
	
	xinput enable $MOUSE_ID
	
	# for_window [title="myvim"] move position center
	kill -9 $VLC_PID
	kill -9 $VLC_PID1
	kill -9 $VLC_PID2
}

alias genvim=vim_cmd

function wait_for_vlc {

	win_name=$"0"
	while ! echo $win_name | grep -iq "brain"; do
		last_win=$(xprop -root _NET_CLIENT_LIST | grep -o '0x[0-9a-f]\+' | tail -n 1 | cut -d':' -f2-)
		win_name=$(xprop -id $last_win WM_NAME)
		sleep 0.1
	done
}

function i3-reload {
	i3-msg reload
	i3-msg restart
}
