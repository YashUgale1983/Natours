// In index.js, we have handled the functionalities of login, logout, update user data, update user password

// here, we select the element as check if it exists. if yes, then call the logout function on click
const logoutButton = document.querySelector(".nav__el--logout");
if (logoutButton) {
  logoutButton.addEventListener("click", () => {
    logout();
  });
}

// here, we select the element and check if it exists. if yes, then call the login function on submit
const loginForm = document.querySelector(".form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    login(email, password);
  });
}

// here, we select the element and check if it exists. if yes, then call the updateSettings function on submit
const userDataForm = document.querySelector(".form-user-data");
const fileInput = document.querySelector(".form__upload");
if (userDataForm) {
  userDataForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);
    updateSettings(form, "data");
  });
}
if (fileInput) {
  fileInput.addEventListener("change", async (e) => {
    const form = new FormData();
    form.append("photo", document.getElementById("photo").files[0]);
    const newImage = await updateSettings(form, "photo");
    if (newImage) {
      document
        .querySelector(".nav__user-img")
        .setAttribute("src", `/img/users/${newImage}`);
      document
        .querySelector(".form__user-photo")
        .setAttribute("src", `/img/users/${newImage}`);
    }
  });
}

// here, we select the element and check if it exists. if yes, then call the updateSettings function on submit
const userPasswordForm = document.querySelector(".form-user-password");
if (userPasswordForm) {
  userPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelector(".btn--save-password").textContent = "Updating...";
    const passwordCurrent = document.getElementById("password-current").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      "password"
    );

    document.querySelector(".btn--save-password").textContent = "Save password";

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });
}

// here, we select the element and check if it exists. if yes, then call the forgotPassword function on click
const forgotPasswordForm = document.querySelector(".form-forgot-password");
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    document.querySelector(".btn-send-email").textContent = "Sending...";
    const email = document.getElementById("email").value;
    await forgotPassword(email);
    document.querySelector(".btn-send-email").textContent = "Send email";
  });
}

// here, we select the element and check if it exists. if yes, then call the resetPassword function on submit
const resetPasswordForm = document.querySelector(".form-reset-password");
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    const resetToken = window.location.pathname.split("/")[2];
    await resetPassword(password, passwordConfirm, resetToken);

    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });
}

const signupEmailForm = document.querySelector(".form-signup-email");
if (signupEmailForm) {
  signupEmailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    document.querySelector(".btn-send-otp").textContent = "Sending OTP...";
    await signupEmail(name, email);
    document.querySelector(".btn-send-otp").textContent = "Continue";
  });
}

// here, we select the element and check if it exists. if yes, then call the signup function on submit
const signupForm = document.querySelector(".form-signup");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    const otp = document.getElementById("otp").value;
    document.querySelector(".btn-signup").textContent = "Creating account...";
    await signup({ username, password, passwordConfirm, otp });
    document.querySelector(".btn-signup").textContent = "Sign up";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
    document.getElementById("otp").value = "";
  });
}

// here, we select the element and check if it exists. if yes, then call the bookTour function imported from stripe.js file
const bookBtn = document.getElementById("book-tour");
if (bookBtn) {
  bookBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.target.textContent = "Processing...";
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}

// this function is used to hide any alert in the DOM
function hideAlert() {
  const el = document.querySelector(".alert");
  if (el) el.parentElement.removeChild(el);
}

// this function is used to display alerts in our own way defined in style.css
function showAlert(type, msg) {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);
  window.setTimeout(hideAlert, 3000);
}

// this function is used for login functionality
const login = async (email, password) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/login", // this calls our API to check if the email and password is correct
      data: {
        email,
        password,
      },
    });

    // if login was successful, this if loop will load the overview page in 1 sec
    if (res.data.status === "success") {
      showAlert("success", "Logging in...");
      window.setTimeout(() => {
        location.assign("/");
      }, 1500);
    }

    // console.log(res);
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

// this function is used to implement logout functionality
const logout = async () => {
  try {
    const res = await axios({
      method: "GET",
      url: "/api/v1/users/logout",
    });

    if (res.data.status === "success") {
      showAlert("success", "Logging out...");
      window.setTimeout(() => {
        // location.reload(true); ---> implement this to reload the current page itself on the server
        location.assign("/"); // ---> implement this to return to overview page after logout
      }, 1500);
    }
  } catch (err) {
    showAlert("error", "Error logging out! Try again.");
  }
};

const updateSettings = async (data, type) => {
  try {
    // console.log("in updateSettings...");
    const url =
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateMe";
    const res = await axios({
      method: "PATCH",
      url,
      data,
    });

    if (type === "photo" && res.data.status === "success") {
      showAlert("success", "Profile picture has been updated.");
      return res.data.data.user.photo; // Assuming the response contains the updated photo information
    } else if (
      (type === "data" || type === "password") &&
      res.data.status === "success"
    ) {
      showAlert("success", `${type.toUpperCase()} updated successfully.`);
    } else {
      showAlert("error", "Error! Please check for errors in data.");
    }
  } catch (err) {
    // showAlert("error", err.response.data.message); ---> this not working.
    showAlert("error", "Error! Please check for errors in entered data.");
  }
};

const forgotPassword = async (email) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/forgotPassword",
      data: {
        email,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Email with link sent. Please check...");
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};

const resetPassword = async (password, passwordConfirm, resetToken) => {
  try {
    const res = await axios({
      method: "PATCH",
      url: `/api/v1/users/resetPassword/${resetToken}`,
      data: {
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Password reset successful. Logging in....");
      window.setTimeout(() => {
        location.assign("/");
      }, 2000);
    }
  } catch (err) {
    // showAlert("error", err.response.data.message); ---> this not working
    showAlert("error", "Error! Please check for errors in entered data.");
  }
};

const signupEmail = async (name, email) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/sendOTP",
      data: {
        name,
        email,
      },
    });
    if (res.data.status === "success") {
      showAlert("success", "OTP sent on your email.");
      window.setTimeout(() => {
        location.assign("/signupForm");
      }, 2000);
    }
  } catch (err) {
    showAlert(
      "error",
      "Error occured in sending the OTP. Please try after some time."
    );
  }
};

const signup = async (data) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signup",
      data,
    });

    if (res.data.status === "success") {
      showAlert("success", "Account created! Check your email.");
      window.setTimeout(() => {
        location.assign("/");
      }, 2000);
    }
  } catch (err) {
    // showAlert("error", err.response.data.message); ---> this not working
    showAlert("error", "Error! Please check for errors in entered data.");
  }
};

const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios({
      method: "GET",
      url: `/api/v1/bookings/checkout-session/${tourId}`,
    });

    // 2) Create checkout form + charge credit card
    await window.location.replace(session.data.session.url);
  } catch (err) {
    showAlert("error", err);
  }
};
