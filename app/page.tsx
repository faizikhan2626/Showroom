"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthCheck from "./components/AuthCheck";
import Image from "next/image";
import {
  FiArrowRight,
  FiShoppingCart,
  FiHeart,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

export default function Home() {
  const categories = [
    {
      title: "Bikes",
      description:
        "Explore top bike brands like Honda, Yamaha & Suzuki with our premium collection.",
      price: "PKR 150,000 - 450,000",
      src: "/images/bike.png",
      features: ["Fuel efficient", "Low maintenance", "1-year warranty"],
      rating: 4.5,
      popularModels: [
        {
          name: "Honda CD 70",
          src: "/images/bike.png",
          price: "PKR 185,000",
        },
        {
          name: "Yamaha YBR 125",
          src: "/images/ybr.png",
          price: "PKR 495,000",
        },
        {
          name: "Suzuki GS 150",
          src: "/images/gs-150.png",
          price: "PKR 620,000",
        },
        {
          name: "Suzuki YBR 125g",
          src: "/images/ybr-g.png",
          price: "PKR 520,000",
        },
      ],
    },
    {
      title: "Electric Bikes",
      description:
        "Eco-friendly electric bikes with modern designs and impressive mileage for urban commuting.",
      price: "PKR 200,000 - 500,000",
      src: "/images/e-bike.png",
      features: ["Zero emissions", "Fast charging", "2-year battery warranty"],
      rating: 4.7,
      popularModels: [
        {
          name: "Jolta JE-70",
          src: "/images/e-bike.png",
          price: "PKR 235,000",
        },
        {
          name: "Metro EB-5",
          src: "/images/e-1.png",
          price: "PKR 275,000",
        },
        {
          name: "Road King E-Max",
          src: "/images/e-2.png",
          price: "PKR 310,000",
        },
        {
          name: "Road King E-Max 2",
          src: "/images/e-3.png",
          price: "PKR 320,000",
        },
      ],
    },
    {
      title: "Rickshaws",
      description:
        "Affordable and reliable rickshaws designed for comfortable city commuting and transport.",
      price: "PKR 250,000 - 600,000",
      src: "/images/rickshaw.png",
      features: ["Spacious seating", "CNG/LPG options", "Durable chassis"],
      rating: 4.3,
      popularModels: [
        {
          name: "Sazgar MAX",
          src: "/images/rickshaw.png",
          price: "PKR 235,000",
        },
        {
          name: "United Auto Rickshaw",
          src: "/images/r-1.png",
          price: "PKR 275,000",
        },
        {
          name: "Road Prince RXR",
          src: "/images/r-2.png",
          price: "PKR 310,000",
        },
        {
          name: "Road Prince RXR 2",
          src: "/images/r-3.png",
          price: "PKR 340,000",
        },
      ],
    },
    {
      title: "Loaders",
      description:
        "Heavy-duty loaders built for commercial transport and cargo with exceptional load capacity.",
      price: "PKR 500,000 - 1,200,000",
      src: "/images/loader.png",
      features: [
        "High torque engines",
        "Reinforced cargo beds",
        "Commercial-grade suspension",
      ],
      rating: 4.6,
      popularModels: [
        {
          name: "Vespa Cargo 150",
          src: "/images/loader.png",
          price: "PKR 235,000",
        },
        {
          name: "United Loader 200",
          src: "/images/l-1.png",
          price: "PKR 275,000",
        },
        {
          name: "Road Prince Hauler",
          src: "/images/l-2.png",
          price: "PKR 310,000",
        },
        {
          name: "Road Prince Hauler 2",
          src: "/images/l-3.png",
          price: "PKR 310,000",
        },
      ],
    },
  ];

  const testimonials = [
    {
      name: "Ali Khan",
      role: "Bike Owner",
      text: "The purchasing process was smooth and the after-sales service is exceptional. Highly recommended!",
      rating: 5,
    },
    {
      name: "Sara Ahmed",
      role: "Small Business Owner",
      text: "My loader has been running perfectly for 2 years now with minimal maintenance. Great investment.",
      rating: 4,
    },
    {
      name: "Usman Malik",
      role: "Delivery Service",
      text: "The electric bikes have reduced our fuel costs by 70%. The range is perfect for city deliveries.",
      rating: 5,
    },
  ];

  const [index, setIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isHovered) {
        setIndex((prev) => (prev + 1) % categories.length);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered]);

  useEffect(() => {
    const testimonialTimer = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(testimonialTimer);
  }, []);

  const handleDotClick = (i: number) => setIndex(i);
  const nextSlide = () => setIndex((prev) => (prev + 1) % categories.length);
  const prevSlide = () =>
    setIndex((prev) => (prev - 1 + categories.length) % categories.length);

  return (
    <AuthCheck>
      <main className="overflow-hidden">
        {/* Hero Carousel Section */}
        <section
          className="relative bg-gradient-to-r from-blue-50 to-blue-100 py-12"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={categories[index].title}
                initial={{ opacity: 0, x: 150 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -150 }}
                transition={{ duration: 0.7 }}
                className="flex flex-col md:flex-row items-center justify-between gap-10"
              >
                {/* Text Content */}
                <div className="flex-1 space-y-6 text-center md:text-left">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-blue-800">
                    {categories[index].title}
                  </h1>
                  <p className="text-blue-700 text-lg md:text-xl">
                    {categories[index].description}
                  </p>
                  <div className="space-y-4">
                    <p className="text-blue-600 font-bold text-xl">
                      {categories[index].price}
                    </p>
                    <div className="flex items-center justify-center md:justify-start">
                      {[...Array(5)].map((_, i) => (
                        <FiStar
                          key={i}
                          className={`${
                            i < Math.floor(categories[index].rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          } w-5 h-5`}
                        />
                      ))}
                      <span className="ml-2 text-blue-700">
                        {categories[index].rating.toFixed(1)}
                      </span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {categories[index].features.map((feature, i) => (
                        <li key={i} className="flex items-center text-blue-700">
                          <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Image */}
                <div className="flex-1 flex justify-center items-center relative">
                  <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl aspect-square relative">
                    <Image
                      src={categories[index].src}
                      alt={categories[index].title}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-md hover:bg-blue-50 transition-colors"
              aria-label="Previous slide"
            >
              <FiChevronLeft className="w-6 h-6 text-blue-700" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-md hover:bg-blue-50 transition-colors"
              aria-label="Next slide"
            >
              <FiChevronRight className="w-6 h-6 text-blue-700" />
            </button>

            {/* Dot Indicators */}
            <div className="flex justify-center mt-8 space-x-3">
              {categories.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleDotClick(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? "bg-blue-700 w-6"
                      : "bg-blue-300 hover:bg-blue-400"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Popular Models Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-blue-800 mb-12">
              Popular Models
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {categories[index].popularModels.map((model, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="bg-blue-50 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="h-48 bg-blue-100 relative">
                    <Image
                      src={model.src}
                      alt={model.name}
                      fill
                      className="object-contain p-4"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-blue-800 mb-2">
                      {model.name}
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 font-medium">
                        {model.price}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800">
                        <FiHeart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 bg-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-blue-800 mb-12">
              What Our Customers Say
            </h2>
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonialIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-white p-8 rounded-xl shadow-md max-w-3xl mx-auto text-center"
                >
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <FiStar
                        key={i}
                        className={`${
                          i < testimonials[testimonialIndex].rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        } w-5 h-5`}
                      />
                    ))}
                  </div>
                  <p className="text-lg text-gray-700 mb-6">
                    `{testimonials[testimonialIndex].text}
                  </p>
                  <div>
                    <p className="font-semibold text-blue-800">
                      {testimonials[testimonialIndex].name}
                    </p>
                    <p className="text-blue-600">
                      {testimonials[testimonialIndex].role}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
    </AuthCheck>
  );
}
