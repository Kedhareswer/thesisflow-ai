'use client';
import { ReactLenis } from 'lenis/react';
import { useTransform, motion, useScroll, MotionValue } from 'motion/react';
import { useRef, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, FileText, Search, Brain, Users, Zap } from 'lucide-react';

interface ResearchFeature {
  title: string;
  description: string;
  image: string;
  color: string;
  icon: React.ReactNode;
}

interface CardProps {
  i: number;
  title: string;
  description: string;
  image: string;
  color: string;
  icon: React.ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  targetScale: number;
}

export const ResearchCard = ({
  i,
  title,
  description,
  image,
  color,
  icon,
  progress,
  range,
  targetScale,
}: CardProps) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start end', 'start start'],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [2, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div
      ref={container}
      className='h-screen flex items-center justify-center sticky top-0'
    >
      <motion.div
        style={{
          scale,
          top: `calc(-5vh + ${i * 25}px)`,
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          borderColor: `${color}40`,
        }}
        className={`glass flex flex-col relative -top-[25%] h-[350px] sm:h-[400px] md:h-[450px] w-[90%] sm:w-[85%] md:w-[80%] lg:w-[70%] p-4 sm:p-6 md:p-8 lg:p-10 origin-top z-20`}
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            {icon}
          </div>
          <h2 className='text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white'>{title}</h2>
        </div>
        
        <div className={`flex flex-col sm:flex-row h-full gap-4 sm:gap-6 md:gap-8 lg:gap-10`}>
          <div className={`w-full sm:w-[45%] relative flex flex-col justify-center`}>
            <p className='text-white/90 text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6'>{description}</p>
            <span className='flex items-center gap-2 sm:gap-3 text-white/80 hover:text-white transition-colors cursor-pointer group'>
              <span className="text-xs sm:text-sm font-medium">Explore Feature</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          <div className={`relative w-full sm:w-[55%] h-32 sm:h-full rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm`}>
            <motion.div
              className={`w-full h-full`}
              style={{ scale: imageScale }}
            >
              <img 
                src={image} 
                alt={title} 
                className='absolute inset-0 w-full h-full object-cover rounded-xl' 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

interface ResearchStackingCardsProps {
  features: ResearchFeature[];
}

const ResearchStackingCards = forwardRef<HTMLElement, ResearchStackingCardsProps>(({ features }, ref) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });


  return (
    <ReactLenis root>
      <main className='bg-black' ref={container}>
        <style jsx global>{`
          .glass {
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid;
            border-radius: 16px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
          }
        `}</style>
        <section className='text-white h-[60vh] sm:h-[70vh] w-full bg-neutral-950 grid place-content-center relative overflow-hidden'>
          {/* Grid pattern background */}
          <div className='absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]'></div>
          
          {/* Orange gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,107,44,0.12),transparent)]" />

          <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
            <h1 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl px-2 sm:px-4 md:px-8 font-bold text-center tracking-tight leading-[120%] mb-4 sm:mb-6'>
              Powerful Research Tools <br className="hidden sm:block" /> 
              <span className="text-[#FF6B2C]">Built for You</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/70 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Discover how ThesisFlow-AI transforms your research workflow with intelligent automation
            </p>
            <div className="flex items-center justify-center gap-2 text-white/60">
              <span className="text-xs sm:text-sm">Scroll to explore</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 animate-bounce" style={{ animationDirection: 'alternate' }} />
            </div>
          </div>
        </section>

        <section className='text-white w-full bg-neutral-950'>
          {features.map((feature, i) => {
            const targetScale = 1 - (features.length - i) * 0.05;
            return (
              <ResearchCard
                key={`feature_${i}`}
                i={i}
                image={feature.image}
                title={feature.title}
                color={feature.color}
                description={feature.description}
                icon={feature.icon}
                progress={scrollYProgress}
                range={[i * 0.25, 1]}
                targetScale={targetScale}
              />
            );
          })}
        </section>
      </main>
    </ReactLenis>
  );
});

ResearchStackingCards.displayName = 'ResearchStackingCards';

export default ResearchStackingCards;
