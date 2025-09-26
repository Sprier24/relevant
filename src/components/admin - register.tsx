"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Eye, EyeOff } from "react-feather"; 

export function RegisterForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: ""
  });
  
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    form: ""
  });
  
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    contact: false,
    password: false,
    confirmPassword: false
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  // Validate form fields
  const validateField = (name: string, value: string) => {
    let error = "";
    
    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.length < 3) error = "Name must be at least 3 characters";
        break;
        
      case "email":
        if (!value) error = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format";
        break;
        
      case "contact":
        if (!value) error = "Contact number is required";
        else if (!/^\d{10,15}$/.test(value)) error = "Invalid contact number (10-15 digits)";
        break;
        
      case "password":
        if (!value) error = "Password is required";
        else if (value.length < 8) error = "Password must be at least 8 characters";
        else if (!/[A-Z]/.test(value)) error = "Password must contain at least one uppercase letter";
        else if (!/[a-z]/.test(value)) error = "Password must contain at least one lowercase letter";
        else if (!/[0-9]/.test(value)) error = "Password must contain at least one number";
        else if (!/[^A-Za-z0-9]/.test(value)) error = "Password must contain at least one special character";
        break;
        
      case "confirmPassword":
        if (!value) error = "Please confirm your password";
        else if (value !== formData.password) error = "Passwords do not match";
        break;
    }
    
    return error;
  };

  // Validate entire form
  const validateForm = () => {
    const newErrors = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      contact: validateField("contact", formData.contact),
      password: validateField("password", formData.password),
      confirmPassword: validateField("confirmPassword", formData.confirmPassword),
      form: ""
    };
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => error !== "");
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field if it's been touched
    if (touched[name as keyof typeof touched]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value),
        form: "" // Clear form-level error when user makes changes
      }));
    }
  };

  // Handle blur events (mark fields as touched)
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    
    if (!touched[name as keyof typeof touched]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
      
      // Validate the field
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, formData[name as keyof typeof formData]),
        form: "" // Clear form-level error when user makes changes
      }));
    }
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      formData.name &&
      formData.email &&
      formData.contact &&
      formData.password &&
      formData.confirmPassword &&
      !Object.values(errors).some(error => error !== "")
    );
  };

  // Handle form submission
  const handleRegister = async () => {
    // Mark all fields as touched to show errors
    setTouched({
      name: true,
      email: true,
      contact: true,
      password: true,
      confirmPassword: true
    });

    // Validate the entire form
    const isValid = validateForm();
    
    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/v1/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          contact: formData.contact
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(prev => ({
          ...prev,
          form: data.message || data.error || "An error occurred. Please try again."
        }));
      } else {
        alert("Registration successful!");
        router.push("/login");
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        form: "An error occurred during registration. Please try again."
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle style={{ textAlign: "center" }}>Register</CardTitle>
        <CardDescription style={{ textAlign: "center" }}>Create a new account.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          {/* Name Input */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.name && errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          {/* Email Input */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.email && errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Contact Input */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="contact">Contact</Label>
            <Input
              name="contact"
              type="tel"
              placeholder="Enter your contact number"
              value={formData.contact}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {touched.contact && errors.contact && <p className="text-red-500 text-xs">{errors.contact}</p>}
          </div>

          {/* Password Input */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {touched.password && errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center text-gray-500"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Display form-level error */}
          {errors.form && <p className="text-red-500 text-sm mt-2">{errors.form}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleRegister} 
          disabled={loading || !isFormValid()}
        >
          {loading ? "Registering..." : "Register"}
        </Button>
      </CardFooter>
    </Card>
  );
}