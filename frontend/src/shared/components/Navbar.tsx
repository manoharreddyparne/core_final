// src/shared/components/Navbar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthProvider/AuthProvider";

const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo / Brand */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold hover:text-gray-200">
              ExamPortal
            </Link>
          </div>

          {/* Links */}
          <div className="hidden md:flex space-x-4 items-center">
            {isAuthenticated ? (
              <>
                <span className="mr-4">Hello, {user?.first_name || user?.username}</span>
                <Link to="/dashboard" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Dashboard
                </Link>
                <Link to="/secure-device" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Secure Device
                </Link>
                <Link to="/students" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Students
                </Link>
                <Link to="/teachers" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Teachers
                </Link>
                <Link to="/create-student" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Create Student
                </Link>
                <Link to="/create-teacher" className="hover:bg-blue-500 px-3 py-2 rounded">
                  Create Teacher
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:bg-blue-500 px-3 py-2 rounded">
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden">
            {/* Optional: add a hamburger menu for mobile */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
