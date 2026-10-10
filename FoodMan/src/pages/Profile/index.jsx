import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  Bell,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { signOut, updateProfile, updatePassword } from "firebase/auth";
import { auth, storage } from "../../config/firebase-config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    address: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: formData.displayName,
      });
      setIsEditing(false);
      showMessage("success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      showMessage("error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords don't match!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters long!");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showMessage("success", "Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      showMessage("error", "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showMessage("error", "Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Image size must be less than 5MB.");
      return;
    }

    setUploadingImage(true);

    try {
      // Create a reference to the user's profile image
      const imageRef = ref(
        storage,
        `profile-images/${user.uid}/${Date.now()}-${file.name}`
      );

      // Upload the file
      const snapshot = await uploadBytes(imageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update the user's profile with the new photo URL
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      showMessage("success", "Profile picture updated successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      showMessage("error", "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!user?.photoURL) return;

    setUploadingImage(true);

    try {
      // Update the user's profile to remove the photo URL
      await updateProfile(auth.currentUser, {
        photoURL: null,
      });

      showMessage("success", "Profile picture removed successfully!");
    } catch (error) {
      console.error("Error removing image:", error);
      showMessage("error", "Failed to remove image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatJoinDate = (user) => {
    if (user?.metadata?.creationTime) {
      return new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return "Recently";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account information and preferences
          </p>
        </div>

        {/* Message Display */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                {/* Profile Picture */}
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#fc7f09] to-[#e56f00] rounded-full flex items-center justify-center relative overflow-hidden">
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2
                          size={20}
                          className="text-white animate-spin"
                        />
                      </div>
                    )}
                    {user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <User size={32} className="text-white" />
                    )}
                  </div>

                  {/* Camera Button */}
                  <button
                    onClick={triggerFileInput}
                    disabled={uploadingImage}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="Upload profile picture"
                  >
                    {uploadingImage ? (
                      <Loader2
                        size={16}
                        className="text-gray-600 animate-spin"
                      />
                    ) : (
                      <Camera size={16} className="text-gray-600" />
                    )}
                  </button>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Profile Picture Actions */}
                {user?.photoURL && (
                  <div className="mb-4">
                    <button
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove Picture
                    </button>
                  </div>
                )}

                {/* User Info */}
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {user?.displayName || "User"}
                </h2>
                <p className="text-gray-600 text-sm mb-4">{user?.email}</p>

                {/* Member Since */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Member Since
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatJoinDate(user)}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Shield size={16} />
                    <span>Change Password</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Personal Information
                </h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-[#fc7f09] hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-[#fc7f09] text-white rounded-lg hover:bg-[#e56f00] transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      <span>{loading ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          displayName: user?.displayName || "",
                          email: user?.email || "",
                          phone: "",
                          address: "",
                        });
                      }}
                      className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-900">
                        {user?.displayName || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{user?.email}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-gray-900">
                        {formData.phone || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-gray-900">
                        {formData.address || "Not set"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Preferences
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Email Notifications
                      </p>
                      <p className="text-sm text-gray-600">
                        Receive updates about your orders
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fc7f09]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard size={20} className="text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Save Payment Methods
                      </p>
                      <p className="text-sm text-gray-600">
                        Securely store cards for faster checkout
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fc7f09]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {isChangingPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Change Password
                </h3>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc7f09] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#fc7f09] text-white rounded-lg hover:bg-[#e56f00] transition-colors disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};
