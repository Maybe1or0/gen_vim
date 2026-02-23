#Back-up (au cazou)
cp ~/.bashrc bashrc.old
cp ~/.config/i3/config config.old


cat bashgen >> ~/.bashrc
cat i3gen >> ~/.config/i3/config
cp genvim-layout.json ~/.config/i3/
cp brainrotvideos ../ 
