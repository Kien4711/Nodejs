    const btnWriteMail = document.querySelector('.btn-write-Email');
    const btnCloseMailBox = document.querySelector('.btn-close-mail-box');
    const mailBox = document.querySelector('.send-email-box');
    const btnUser = document.querySelector('.user-wrapper')
    const menuUser = document.querySelector('.user-menu')
    const btnLabel = document.querySelector('.btn-label')
    const labelBox = document.querySelector('.container-label-box')
    const btnCloseLabelBox = document.querySelector('.btn-close-label-box')
    const btnCancelLabelBox = document.querySelector('.btn-cancel-label')
    const btnDetailMail = document.querySelector('.btnDetailMail-star')

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


let isStar = false;
btnDetailMail.addEventListener('click', () => {
    if(isStar) {
        btnDetailMail.classList.remove('fa-star-o');
        btnDetailMail.classList.add('fa-star')
        isStar = false;
    }
    else {
        btnDetailMail.classList.remove('fa-star');
        btnDetailMail.classList.add('fa-star-o')
        isStar = true;
    }
})
