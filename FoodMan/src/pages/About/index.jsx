import React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { ChefHat, Heart, Users, Award, Clock, MapPin } from "lucide-react";

export const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#fc7f09] to-[#e56f00] text-white py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <ChefHat className="w-12 h-12 mr-4" />
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                About FoodMan
              </h1>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl mb-8 opacity-90 leading-relaxed">
              Delivering exceptional culinary experiences
              <br className="hidden sm:block" />
              right to your doorstep since day one
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Our Story Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 text-center">
              Our Story
            </h2>
            <div className="prose prose-lg mx-auto text-gray-600">
              <p className="text-lg leading-relaxed mb-6">
                FoodMan was born from a simple yet powerful vision: to bring the
                finest culinary experiences directly to your home. Founded by
                passionate food enthusiasts, we believe that great food should
                be accessible to everyone, regardless of where they are.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                What started as a small local delivery service has grown into a
                comprehensive food platform that connects food lovers with
                exceptional restaurants and chefs. We're not just about delivery
                – we're about creating memorable dining experiences that bring
                people together.
              </p>
              <p className="text-lg leading-relaxed">
                Every meal we deliver carries our commitment to quality,
                freshness, and customer satisfaction. From carefully curated
                menus to lightning-fast delivery, we ensure that every bite
                exceeds your expectations.
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-12 text-center">
            What We Stand For
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-[#fc7f09] rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Quality First
              </h3>
              <p className="text-gray-600">
                We partner only with the finest restaurants and use the freshest
                ingredients to ensure every meal meets our high standards.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-[#fc7f09] rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Fast Delivery
              </h3>
              <p className="text-gray-600">
                Your time is precious. That's why we've optimized our delivery
                network to bring your favorite meals to you as quickly as
                possible.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-[#fc7f09] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Customer Focus
              </h3>
              <p className="text-gray-600">
                Every decision we make is centered around creating the best
                possible experience for our customers. Your satisfaction is our
                success.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-[#fc7f09] to-[#e56f00] rounded-2xl text-white p-8 lg:p-12 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-12 text-center">
            FoodMan by the Numbers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2">10K+</div>
              <div className="text-lg opacity-90">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2">4.9★</div>
              <div className="text-lg opacity-90">Average Rating</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2">50K+</div>
              <div className="text-lg opacity-90">Orders Delivered</div>
            </div>
            <div>
              <div className="text-4xl lg:text-5xl font-bold mb-2">30min</div>
              <div className="text-lg opacity-90">Avg Delivery Time</div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-12 text-center">
            Meet the Founder
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-[#fc7f09] to-[#e56f00] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl font-bold text-white">SK</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Samhith Kalari
              </h3>
              <p className="text-[#fc7f09] font-semibold mb-4">Founder & CEO</p>
              <p className="text-gray-600 leading-relaxed">
                A passionate entrepreneur with a vision to revolutionize food
                delivery. Samhith combines his love for technology and culinary
                arts to create exceptional dining experiences for food lovers
                everywhere.
              </p>
              <div className="flex justify-center space-x-4 mt-6">
                <a
                  href="mailto:samhith06@gmail.com"
                  className="text-[#fc7f09] hover:text-[#e56f00] transition-colors"
                >
                  Contact
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href="tel:+919390050005"
                  className="text-[#fc7f09] hover:text-[#e56f00] transition-colors"
                >
                  +91 9390050005
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-[#fc7f09] rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Our Mission
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              To make exceptional food accessible to everyone by connecting
              passionate chefs and restaurants with food lovers through
              innovative technology and unparalleled service. We're building a
              future where great food is just a click away.
            </p>
            <div className="flex items-center justify-center space-x-2 text-[#fc7f09]">
              <MapPin className="w-5 h-5" />
              <span className="font-medium">
                Currently serving communities across Hyderabad with love and
                dedication
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
