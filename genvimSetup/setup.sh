#Back-up (au cazou)
cp ~/.bashrc bashrc.old
cp ~/.config/i3/config config.old


cat bashgen >> ~/.bashrc
sed -i '/^bindsym \$mod+w/d' ~/.config/i3/config
cat i3gen >> ~/.config/i3/config
cp genvim-layout.json ~/.config/i3/
cp -r brainrotvideos ../../ 
