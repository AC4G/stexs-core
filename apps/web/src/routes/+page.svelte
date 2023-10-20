<script>
  import { stexsClient } from "../stexsClient";
  let mfaCode = "";

  const handleSignIn = async () => {
    try {
      const response = await stexsClient.auth.signIn("AC4G", "Test12345.");
      console.log("Sign In Response:", response);
    } catch (error) {
      console.error("Sign In Error:", error);
    }
  };

  const handleSignInConfirm = async () => {
    try {
      if (mfaCode.trim() === "") {
        console.error("MFA code is required.");
        return;
      }

      const response = await stexsClient.auth.signInConfirm("email", mfaCode);
      console.log("Sign In Confirm Response:", response);
    } catch (error) {
      console.error("Sign In Confirm Error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await stexsClient.auth.signOut();
      console.log("Sign Out Successful");
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  const getProfiles = async () => {
    try {
      const response = await stexsClient.from("profiles").select();
      console.log("Profiles Response:", response);
    } catch (error) {
      console.error("Profiles Error:", error);
    }
  };
</script>

<section>
  <h1>Welcome</h1>

  <input type="text" bind:value={mfaCode} placeholder="Enter MFA Code" />

  <button on:click={handleSignIn}>Sign In</button>
  <button on:click={handleSignInConfirm}>Confirm Sign In</button>
  <button on:click={handleSignOut}>Sign Out</button>
  <button on:click={getProfiles}>Get Profiles</button>
</section>
