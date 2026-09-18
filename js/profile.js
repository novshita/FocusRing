import { readText, writeText, removeKey } from './storage.js';

const settingsPanel = document.getElementById('settingsPanel');
const userBtnIcon = document.getElementById('userBtnIcon');
const userBtnImg = document.getElementById('userBtnImg');
const userBtnName = document.getElementById('userBtnName');
const avatarBtn = document.getElementById('avatarBtn');
const avatarMenu = document.getElementById('avatarMenu');
const avatarViewOption = document.getElementById('avatarViewOption');
const avatarUploadOption = document.getElementById('avatarUploadOption');
const avatarRemoveOption = document.getElementById('avatarRemoveOption');
const avatarInput = document.getElementById('avatarInput');
const photoViewer = document.getElementById('photoViewer');
const photoViewerImg = document.getElementById('photoViewerImg');
const photoViewerClose = document.getElementById('photoViewerClose');
const profileIcon = document.getElementById('profileIcon');
const profileImg = document.getElementById('profileImg');
const profileNameInput = document.getElementById('profileNameInput');
const profileBioInput = document.getElementById('profileBioInput');
const bioSaveBtn = document.getElementById('bioSaveBtn');

const NAME_KEY = 'focusring_profile_name';
const AVATAR_KEY = 'focusring_profile_avatar';
const BIO_KEY = 'focusring_profile_bio';
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const AVATAR_MAX_PX = 256;

function setAvatarImage(dataUrl){
  const hasAvatar = !!dataUrl;
  userBtnImg.src = dataUrl || '';
  userBtnImg.hidden = !hasAvatar;
  userBtnIcon.hidden = hasAvatar;
  profileImg.src = dataUrl || '';
  profileImg.hidden = !hasAvatar;
  profileIcon.hidden = hasAvatar;
  avatarViewOption.hidden = !hasAvatar;
  avatarRemoveOption.hidden = !hasAvatar;
}

// The avatar renders at 72px, so storing the original file would waste the
// localStorage quota -- base64 in storage costs roughly 2.7x the file size.
function shrinkAvatar(dataUrl, done){
  const img = new Image();
  img.onload = () => {
    const crop = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(crop, AVATAR_MAX_PX);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (img.width - crop) / 2, (img.height - crop) / 2, crop, crop,
      0, 0, canvas.width, canvas.height);
    done(canvas.toDataURL('image/png'));
  };
  img.onerror = () => done(null);
  img.src = dataUrl;
}

function openAvatarMenu(){
  avatarMenu.hidden = false;
  avatarBtn.setAttribute('aria-expanded', 'true');
}

function closeAvatarMenu(){
  avatarMenu.hidden = true;
  avatarBtn.setAttribute('aria-expanded', 'false');
}

function openPhotoViewer(){
  const dataUrl = readText(AVATAR_KEY);
  if(!dataUrl) return;
  photoViewerImg.src = dataUrl;
  photoViewer.hidden = false;
}

function closePhotoViewer(){
  photoViewer.hidden = true;
  photoViewerImg.src = '';
}

function saveBio(){
  const bio = profileBioInput.value.trim();
  if(bio){ writeText(BIO_KEY, bio); }
  else { removeKey(BIO_KEY); }
}

export function initProfile(){
  const name = readText(NAME_KEY);
  profileNameInput.value = name;
  userBtnName.textContent = name || 'Guest';
  profileBioInput.value = readText(BIO_KEY);
  setAvatarImage(readText(AVATAR_KEY));

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if(avatarMenu.hidden){ openAvatarMenu(); } else { closeAvatarMenu(); }
  });

  document.addEventListener('click', (e) => {
    if(!avatarMenu.hidden && !avatarMenu.contains(e.target) && e.target !== avatarBtn){
      closeAvatarMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(!photoViewer.hidden){ closePhotoViewer(); }
    else if(!avatarMenu.hidden){ closeAvatarMenu(); }
  });

  avatarViewOption.addEventListener('click', () => {
    closeAvatarMenu();
    openPhotoViewer();
  });

  photoViewerClose.addEventListener('click', closePhotoViewer);

  photoViewer.addEventListener('click', (e) => {
    if(e.target === photoViewer) closePhotoViewer();
  });

  avatarUploadOption.addEventListener('click', () => {
    closeAvatarMenu();
    avatarInput.click();
  });

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    avatarInput.value = '';
    if(!file) return;
    if(!file.type.startsWith('image/')){
      alert('Please choose an image file.');
      return;
    }
    if(file.size > MAX_AVATAR_BYTES){
      alert('Please choose an image smaller than 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      shrinkAvatar(reader.result, small => {
        if(!small){
          alert("That image couldn't be read. Try a different file.");
          return;
        }
        if(!writeText(AVATAR_KEY, small)){
          alert("Couldn't save your photo — browser storage is full. Remove the photo and try again.");
          return;
        }
        setAvatarImage(small);
      });
    };
    reader.readAsDataURL(file);
  });

  avatarRemoveOption.addEventListener('click', () => {
    closeAvatarMenu();
    removeKey(AVATAR_KEY);
    setAvatarImage('');
  });

  profileNameInput.addEventListener('input', () => {
    userBtnName.textContent = profileNameInput.value.trim() || 'Guest';
  });

  profileNameInput.addEventListener('change', () => {
    const value = profileNameInput.value.trim();
    if(value){ writeText(NAME_KEY, value); }
    else { removeKey(NAME_KEY); }
  });

  profileBioInput.addEventListener('change', saveBio);

  bioSaveBtn.addEventListener('click', () => {
    saveBio();
    profileBioInput.blur();
    settingsPanel.classList.remove('open');
  });
}
