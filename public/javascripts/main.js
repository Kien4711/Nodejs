document.addEventListener('DOMContentLoaded', function() {
  const btnWriteMail = document.querySelector('.btn-write-Email');
  const btnCloseMailBox = document.querySelector('.btn-close-mail-box');
  const mailBox = document.querySelector('.send-email-box');
  const btnUser = document.querySelector('.user-wrapper')
  const menuUser = document.querySelector('.user-menu')
  const btnLabel = document.querySelector('.btn-label')
  const labelBox = document.querySelector('.container-label-box')
  const btnCloseLabelBox = document.querySelector('.btn-close-label-box')
  const btnCancelLabelBox = document.querySelector('.btn-cancel-label')
  const btnDetailMails = document.querySelectorAll('.btnDetailMail-star');
  const mailCards = document.querySelectorAll('.email-zoom-out');
  const optionMail = document.querySelector('.option-email')
  const mailTime = document.querySelector('.date-email')
  const linkToProfile = document.getElementById("profile-link")
  const btnDetailMail = document.querySelector('.btnDetailMail-star')
  const btnReplyMail = document.querySelector('.btnDetailMail-reply-main')
  const replyMailBox = document.getElementById('reply-mail-box')
  const btnCloseReplyMailBox = document.querySelector('.btn-close-reply-mail-box')

  const btnForwardMail = document.querySelector('.btnDetailMail-forward-main')
  const forwardMailBox = document.getElementById('forward-mail-box')
  const btnCloseForwardMailBox = document.querySelector('.btn-close-forward-mail-box')

  const btnDisplaySearchAdvanceBox = document.querySelector('.search-wrapper .fa-tasks');
  const searchAdvanceBox = document.querySelector('.search-advance');
      
  const btnMoreOptionLabels = document.querySelector('.more-btn');
  const moreOptionLabelsBox = document.querySelector('.more-options');
  let isLabelMenuOpen = false;
  btnWriteMail.addEventListener('click', () => {
      mailBox.classList.remove("display-mail-box");
  })

  btnCloseMailBox.addEventListener('click', () => {
      mailBox.classList.add("display-mail-box");
  })

  ////////////////reply mail box////////////////////

  btnReplyMail.addEventListener('click', () => {
    replyMailBox.classList.remove("display-mail-box");
  })

  btnCloseReplyMailBox.addEventListener('click', () => {
    replyMailBox.classList.add("display-mail-box");
  })

  ///////////////////forward mail box////////////////////

  btnForwardMail.addEventListener('click', () => {
    forwardMailBox.classList.remove("display-forward-box");
  })

  btnCloseForwardMailBox.addEventListener('click', () => {
    forwardMailBox.classList.add("display-forward-box");
  })


  btnMoreOptionLabels.addEventListener('click', () => {
    if (isLabelMenuOpen) {
        moreOptionLabelsBox.classList.remove('display-active');
        isLabelMenuOpen = false;
    } else {
        moreOptionLabelsBox.classList.add('display-active');
        isLabelMenuOpen = true;
    }
});


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
  // // Lắng nghe sự kiện click vào link Profile
  linkToProfile.addEventListener("click", function(event) {
      event.preventDefault(); // Ngăn chặn chuyển hướng đến trang khác khi click vào link
      window.location.href = "/profile"; // Chuyển hướng đến trang profile của người dùng đang đăng nhập
  });


let isStar = false;
btnDetailMails.forEach(btnDetailMail => {
  btnDetailMail.addEventListener('click', () => {
    if (isStar) {
      btnDetailMail.classList.remove('fa-star-o');
      btnDetailMail.classList.add('fa-star');
      isStar = false;
    } else {
      btnDetailMail.classList.remove('fa-star');
      btnDetailMail.classList.add('fa-star-o');
      isStar = true;
    }
  });
});

mailCards.forEach(mailCard => {
  
})


$(document).ready(function() {
  $('#logout-link').click(function(event) {
    event.preventDefault(); // ngăn chặn trình duyệt chuyển hướng đến href của thẻ a
    $.ajax({
      url: '/logout', // đường dẫn tới route xử lý đăng xuất
      method: 'POST',
      success: function(response) {
        // thông báo người dùng và chuyển hướng đến trang đăng nhập
        //alert(response.message);
        alert("logout")
        window.location.href = '/login';
      },
      error: function(error) {
        // hiển thị thông báo lỗi nếu có lỗi xảy ra
        alert(error.responseJSON.error);
      }
    });
  });
});

    ////////////////////////Search Advance ////////////////////////

    let isSearchAdvanceBoxOpen = false;
    btnDisplaySearchAdvanceBox.addEventListener('click', () => {
      if (isSearchAdvanceBoxOpen) {
        searchAdvanceBox.style.display = 'none';
        isSearchAdvanceBoxOpen = false;
      } else {
        searchAdvanceBox.style.display = 'block';
        isSearchAdvanceBoxOpen = true;
      }
    });
  
    //////////////////////////////////////////////////////////////

$(document).ready(function() {
  $('.btnDetailMail-star').click(function() {
    var emailId = $(this).data('email-id');
    var url = '/emails/' + emailId + '/started';
    $.ajax({
      url: url,
      method: 'POST',
      success: function(response) {
        alert(response.message);
      },
      error: function(error) {
        alert(error.responseJSON.error);
      }
    });
  });
});
});