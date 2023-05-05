    const btnWriteMail = document.querySelector('.btn-write-Email');
    const btnCloseMailBox = document.querySelector('.btn-close-mail-box');
    const mailBox = document.querySelector('.send-email-box');
    const btnUser = document.querySelector('.user-wrapper')
    const menuUser = document.querySelector('.user-menu')
    const btnLabel = document.querySelector('.btn-label')
    const labelBox = document.querySelector('.container-label-box')
    const btnCloseLabelBox = document.querySelector('.btn-close-label-box')
    const btnCancelLabelBox = document.querySelector('.btn-cancel-label')
    const linkToProfile = document.getElementById("profile-link")

    btnWriteMail.addEventListener('click', () => {
        mailBox.classList.remove("display-mail-box");
    })

    btnCloseMailBox.addEventListener('click', () => {
        mailBox.classList.add("display-mail-box");
    })

    let isMenuOpen = false;
    btnUser.addEventListener('click', () => {
        if (isMenuOpen) {
            menuUser.classList.remove('display-menu-user');
            isMenuOpen = false
        } else {
            menuUser.classList.add('display-menu-user');
            isMenuOpen = true;
        }
    })

    btnLabel.addEventListener('click', () => {
        labelBox.classList.remove('label-active')
    })

    btnCloseLabelBox.addEventListener('click', () => {
        labelBox.classList.add('label-active')
    })

    btnCancelLabelBox.addEventListener('click', () => {
        labelBox.classList.add('label-active')
    })

    const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
    })
    // Lắng nghe sự kiện click vào link Profile
    linkToProfile.addEventListener("click", function(event) {
        event.preventDefault(); // Ngăn chặn chuyển hướng đến trang khác khi click vào link
        window.location.href = "/profile"; // Chuyển hướng đến trang profile của người dùng đang đăng nhập
    });