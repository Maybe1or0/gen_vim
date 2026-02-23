cp ~/.bashrc bashrc.old
cp ~/.config/i3/config config.old

# echo $(cat bashgen) >> test
# echo $(cat i3gen) >> nvtest

cat bashgen >> test
cat i3gen >> nvtest
mv genvim-layout.json ~/.config/i3/
