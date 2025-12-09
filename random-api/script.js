"use strict";

const $refresh = document.getElementById("refresh");
const $status = document.getElementById("status");
const $profile = document.getElementById("profile");

const $avatar = document.getElementById("avatar");
const $name = document.getElementById("name");
const $email = document.getElementById("email");
const $phone = document.getElementById("phone");
const $age = document.getElementById("age");
const $location = document.getElementById("location");

function setStatus(msg) {
  $status.textContent = msg;
}

function setLoading(isLoading) {
  $refresh.disabled = isLoading;
  $refresh.textContent = isLoading ? "Loading..." : "Get Random User";
}

function renderUser(u) {
  const fullName = `${u.name.title} ${u.name.first} ${u.name.last}`;
  $name.textContent = fullName;
  $email.textContent = u.email;
  $phone.textContent = u.phone;
  $age.textContent = String(u.dob.age);
  $location.textContent = `${u.location.city}, ${u.location.country}`;

  $avatar.src = u.picture.large;
  $avatar.alt = `${fullName} photo`;

  $profile.hidden = false;
}

async function fetchRandomUser() {
  setStatus("");
  setLoading(true);
  $profile.hidden = true;

  try {
    const res = await fetch("https://randomuser.me/api/");
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();

    const user = data.results?.[0];
    if (!user) throw new Error("No user returned.");
    renderUser(user);
  } catch (err) {
    setStatus(`Error: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

$refresh.addEventListener("click", fetchRandomUser);

// Load one automatically on open
fetchRandomUser();
