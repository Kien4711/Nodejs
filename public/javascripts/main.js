// document.addEventListener('DOMContentLoaded', function() {
  const btnWriteMail = document.querySelector('.btn-write-Email');
  const btnCloseMailBox = document.querySelector('.btn-close-mail-box');
  const mailBox = document.querySelector('.send-email-box');

  const mailCards = document.querySelectorAll('.email-zoom-out');
  const optionMail = document.querySelector('.option-email')
  const mailTime = document.querySelector('.date-email')


  const btnDetailMail = document.querySelector('.btnDetailMail-star')
  const btnReplyMail = document.querySelector('.btnDetailMail-reply-main')
  const replyMailBox = document.getElementById('reply-mail-box')
  const btnCloseReplyMailBox = document.querySelector('.btn-close-reply-mail-box')

  const btnForwardMail = document.querySelector('.btnDetailMail-forward-main')
  const forwardMailBox = document.getElementById('forward-mail-box')
  const btnCloseForwardMailBox = document.querySelector('.btn-close-forward-mail-box')


      
  const btnMoreOptionLabels = document.querySelector('.more-btn');
  const moreOptionLabelsBox = document.querySelector('.more-options');
  let isLabelMenuOpen = false;

  btnWriteMail.addEventListener('click', () => {
      mailBox.classList.remove("display-mail-box");
  })

  btnCloseMailBox.addEventListener('click', () => {
      mailBox.classList.add("display-mail-box");
  })
/////////Mở rộng profile button//////////////
const btnUser = document.querySelector('.user-wrapper')
const menuUser = document.querySelector('.user-menu')
let isMenuOpen = false;
btnUser.addEventListener('click', () => {
    if (isMenuOpen) {
        menuUser.classList.remove('display-menu-user');
        isMenuOpen = false;
    } else {
        menuUser.classList.add('display-menu-user');
        isMenuOpen = true;
    }
});
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



  const fileInput = document.getElementById('fileInput')
  fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
  })







    ////////////////////////Search Advance ////////////////////////


  
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


// });




